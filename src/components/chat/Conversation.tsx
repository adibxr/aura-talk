'use client';
import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
  limit,
  setDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Message, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Logo from '@/components/Logo';

interface ConversationProps {
  partner: UserProfile;
  onBack: () => void;
}

const Conversation: FC<ConversationProps> = ({ partner, onBack }) => {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const chatId = user && partner ? [user.uid, partner.uid].sort().join('_') : null;

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
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
  }, [chatId]);

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
    if (newMessage.trim() === '' || !user || !userData || !chatId) return;

    const messageData = {
      senderId: user.uid,
      senderUsername: userData.username,
      senderProfilePic: userData.profilePic,
      receiverId: partner.uid,
      text: newMessage,
      timestamp: Timestamp.now(),
      seen: false,
    };

    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

    await setDoc(doc(db, 'chats', chatId), {
      members: [user.uid, partner.uid],
      lastMessage: newMessage,
      lastMessageTimestamp: messageData.timestamp,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setNewMessage('');
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-4 p-4 border-b">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={partner.profilePic || undefined} alt={partner.username} />
                <AvatarFallback><Logo className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
              </Avatar>
              <h2 className="font-bold text-lg">{partner.username}</h2>
            </div>
        </header>
        <div className="flex-grow flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
       <header className="flex items-center gap-4 p-4 border-b">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={partner.profilePic || undefined} alt={partner.username} />
                <AvatarFallback><Logo className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
              </Avatar>
              <h2 className="font-bold text-lg">{partner.username}</h2>
            </div>
        </header>
        
      <ScrollArea className="flex-grow" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex items-start gap-3', msg.senderId === user?.uid ? 'justify-end' : '')}
            >
              {msg.senderId !== user?.uid && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.senderProfilePic || undefined} alt={msg.senderUsername} />
                  <AvatarFallback><Logo className="h-4 w-4 text-muted-foreground"/></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn('p-3 rounded-lg max-w-xs md:max-w-md', msg.senderId === user?.uid ? 'bg-accent text-accent-foreground rounded-br-none' : 'bg-muted rounded-bl-none')}
              >
                <p className="text-sm">{msg.text}</p>
                 <time className="text-xs opacity-70 mt-1 block text-right">
                    {msg.timestamp && format(msg.timestamp.toDate(), 'p')}
                  </time>
              </div>
              {msg.senderId === user?.uid && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.senderProfilePic || undefined} alt={msg.senderUsername} />
                  <AvatarFallback><Logo className="h-4 w-4 text-muted-foreground"/></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t p-4">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${partner.username}`}
          autoComplete="off"
        />
        <Button type="submit" size="icon" variant="ghost" disabled={!newMessage.trim()}>
          <Send className="h-5 w-5 text-accent" />
        </Button>
      </form>
    </div>
  );
};

export default Conversation;
