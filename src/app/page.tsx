'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  MessageCircle,
  Users,
  Settings as SettingsIcon,
  Loader2,
  LogOut,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import WorldChat from '@/components/chat/WorldChat';
import DirectMessages from '@/components/chat/DirectMessages';
import Settings from '@/components/chat/Settings';
import Logo from '@/components/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, userData, loading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('world-chat');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  }

  if (loading || !user || !userData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-4 md:p-6">
      <Card className="w-full max-w-4xl h-full flex flex-col shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-accent" />
            <h1 className="text-xl font-bold text-foreground">Aura Talk</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={userData.profilePic || undefined}
                  alt={userData.username}
                />
                <AvatarFallback>
                  <Logo className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm hidden md:inline">
                {userData.username}
              </span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-grow flex flex-col"
        >
          <TabsList className="m-2">
            <TabsTrigger value="world-chat" className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              World Chat
            </TabsTrigger>
            <TabsTrigger value="direct-messages" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Direct Messages
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-hidden">
            <TabsContent value="world-chat" className="h-full mt-0">
              <WorldChat />
            </TabsContent>
            <TabsContent value="direct-messages" className="h-full mt-0">
              <DirectMessages />
            </TabsContent>
            <TabsContent value="settings" className="h-full mt-0">
              <Settings />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
