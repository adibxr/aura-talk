'use client';

import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Logo from '../Logo';

export default function WorldChat() {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'groups', 'world', 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user || !userData) return;

    await addDoc(collection(db, 'groups', 'world', 'messages'), {
      senderId: user.uid,
      senderUsername: userData.username,
      senderProfilePic: userData.profilePic,
      text: newMessage,
      timestamp: Timestamp.now(),
    });

    setNewMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-2 md:p-4">
      <ScrollArea className="flex-grow" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-start gap-3',
                msg.senderId === user?.uid ? 'justify-end' : ''
              )}
            >
              {msg.senderId !== user?.uid && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.senderProfilePic || undefined} alt={msg.senderUsername} />
                  <AvatarFallback>
                    <Logo className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'p-3 rounded-lg max-w-xs md:max-w-md',
                  msg.senderId === user?.uid
                    ? 'bg-accent text-accent-foreground rounded-br-none'
                    : 'bg-muted rounded-bl-none'
                )}
              >
                <div className="flex items-baseline gap-2">
                  <p className="font-bold text-sm">{msg.senderUsername}</p>
                  <time className="text-xs opacity-70">
                    {msg.timestamp &&
                      format(msg.timestamp.toDate(), 'p')}
                  </time>
                </div>
                <p className="text-sm mt-1">{msg.text}</p>
              </div>
              {msg.senderId === user?.uid && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.senderProfilePic || undefined} alt={msg.senderUsername} />
                  <AvatarFallback>
                    <Logo className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 border-t p-2 md:p-4 mt-2"
      >
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message in World Chat..."
          autoComplete="off"
        />
        <Button type="submit" size="icon" variant="ghost" disabled={!newMessage.trim()}>
          <Send className="h-5 w-5 text-accent"/>
        </Button>
      </form>
    </div>
  );
}
