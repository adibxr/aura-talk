'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { db, storage, auth } from '@/lib/firebase';
import { doc, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateEmail as updateAuthEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import Logo from '../Logo';

const formSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }).max(20, { message: 'Username must be at most 20 characters.' }).regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
});

export default function Settings() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      username: userData?.username || '',
      email: userData?.email || '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userData) return;

    setIsLoading(true);
    const batch = writeBatch(db);

    try {
      // Handle username change
      if (values.username !== userData.username) {
        const newUsernameRef = doc(db, 'usernames', values.username.toLowerCase());
        const usernameDoc = await getDoc(newUsernameRef);
        if (usernameDoc.exists()) {
          form.setError('username', { type: 'manual', message: 'This username is already taken.' });
          setIsLoading(false);
          return;
        }
        const oldUsernameRef = doc(db, 'usernames', userData.username.toLowerCase());
        batch.delete(oldUsernameRef);
        batch.set(newUsernameRef, { uid: user.uid });
        batch.update(doc(db, 'users', user.uid), { username: values.username });
      }

      // Handle email change - Note: Firebase requires recent re-authentication for this.
      // This basic implementation might fail if the user hasn't logged in recently.
      if (values.email !== userData.email) {
        try {
          await updateAuthEmail(user, values.email);
          batch.update(doc(db, 'users', user.uid), { email: values.email });
        } catch (error: any) {
           toast({ variant: 'destructive', title: 'Email Update Failed', description: 'Re-authentication is required to update your email. Please log out and log back in.' });
           setIsLoading(false);
           return;
        }
      }
      
      await batch.commit();

      // Handle profile picture upload
      if (file) {
        setUploadProgress(0);
        const storageRef = ref(storage, `profile-pics/${user.uid}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload failed:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              await updateDoc(doc(db, 'users', user.uid), { profilePic: downloadURL });
              setFile(null);
              setPreviewUrl(null);
              setUploadProgress(null);
              resolve();
            }
          );
        });
      }

      toast({ title: 'Profile Updated', description: 'Your profile has been successfully updated.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  }

  if (!userData) return null;

  return (
    <div className="p-4 h-full">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Manage your account details and profile picture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={previewUrl || userData.profilePic || undefined} />
                <AvatarFallback className="text-2xl">
                  <Logo className="h-10 w-10 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <Button size="icon" variant="outline" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4" />
              </Button>
              <Input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{userData.username}</h3>
              <p className="text-sm text-muted-foreground">{userData.email}</p>
            </div>
          </div>
          {uploadProgress !== null && <Progress value={uploadProgress} className="w-full" />}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
    </div>
  );
}
