'use client';

import { searchContactsAndSuggest } from '@/ai/flows/ai-suggested-contacts';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, UserPlus, MessageSquarePlus } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, onSnapshot, getDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, Chat } from '@/lib/types';
import Conversation from './Conversation';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Logo from '../Logo';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';

type FullChat = Chat & { partner: UserProfile };

export default function DirectMessages() {
  const { user, userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [suggestedContacts, setSuggestedContacts] = useState<UserProfile[]>([]);
  const [activeChats, setActiveChats] = useState<FullChat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<UserProfile | null>(null);

  const fetchUserProfiles = useCallback(async (usernames: string[]): Promise<UserProfile[]> => {
    if (usernames.length === 0) return [];
    const profiles: UserProfile[] = [];
    
    for (const username of usernames) {
      const usernameDocRef = doc(db, 'usernames', username.toLowerCase());
      const usernameDoc = await getDoc(usernameDocRef);
      if (usernameDoc.exists()) {
        const userDocRef = doc(db, 'users', usernameDoc.data().uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          profiles.push({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
        }
      }
    }
    return profiles;
  }, []);

  const handleSearch = async () => {
    if (!userData || !searchQuery) return;
    setIsSearching(true);
    setSearchResults([]);
    setSuggestedContacts([]);
    try {
      const existingContacts = activeChats.map(c => c.partner.username);
      const result = await searchContactsAndSuggest({ query: searchQuery, existingContacts });
      
      const [foundUsers, suggestedUsers] = await Promise.all([
        fetchUserProfiles(result.searchResults),
        fetchUserProfiles(result.suggestedContacts)
      ]);

      setSearchResults(foundUsers.filter(u => u.uid !== user?.uid));
      setSuggestedContacts(suggestedUsers.filter(u => u.uid !== user?.uid));

    } catch (error) {
      console.error("Error searching contacts:", error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('members', 'array-contains', user.uid),
      orderBy('lastMessageTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      const partnerIds = chatsData.map(c => c.members.find(m => m !== user.uid)).filter(Boolean) as string[];

      if (partnerIds.length === 0) {
        setLoadingChats(false);
        setActiveChats([]);
        return;
      }
      
      const partners: Record<string, UserProfile> = {};
      const userDocs = await getDocs(query(collection(db, 'users'), where('__name__', 'in', partnerIds)));
      userDocs.forEach(doc => {
        partners[doc.id] = { uid: doc.id, ...doc.data() } as UserProfile;
      });

      const fullChats: FullChat[] = chatsData
        .map(chat => {
          const partnerId = chat.members.find(m => m !== user.uid);
          if (partnerId && partners[partnerId]) {
            return { ...chat, partner: partners[partnerId] };
          }
          return null;
        })
        .filter((c): c is FullChat => c !== null);

      setActiveChats(fullChats);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (selectedPartner) {
    return <Conversation partner={selectedPartner} onBack={() => setSelectedPartner(null)} />;
  }

  const renderUserList = (title: string, users: UserProfile[], isSuggestion = false) => (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground my-2 px-4">{title}</h3>
      {users.map(u => (
        <div key={u.uid} className="flex items-center gap-3 p-2 mx-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => setSelectedPartner(u)}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={u.profilePic || undefined} alt={u.username} />
            <AvatarFallback><Logo className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{u.username}</p>
          </div>
          {isSuggestion && <Badge variant="outline">Suggested</Badge>}
          <UserPlus className="h-5 w-5 text-muted-foreground" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="flex gap-2">
        <Input 
          placeholder="Search for users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      
      <ScrollArea className="flex-grow">
        {(isSearching || loadingChats) ? (
            <div className="flex items-center justify-center h-full pt-10">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        ) : (
          <>
            {searchResults.length > 0 && renderUserList('Search Results', searchResults)}
            {suggestedContacts.length > 0 && renderUserList('Suggestions', suggestedContacts, true)}
            
            {(searchResults.length > 0 || suggestedContacts.length > 0) && activeChats.length > 0 && <Separator className="my-4"/>}

            {activeChats.length > 0 ? (
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground my-2 px-4">Conversations</h3>
                    {activeChats.map(chat => (
                        <div key={chat.id} className="flex items-center gap-3 p-2 mx-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => setSelectedPartner(chat.partner)}>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={chat.partner.profilePic || undefined} alt={chat.partner.username} />
                                <AvatarFallback><Logo className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold truncate">{chat.partner.username}</p>
                                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (searchResults.length === 0 && suggestedContacts.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full pt-10 text-center">
                  <MessageSquarePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium text-muted-foreground">No Messages Yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      Search for users to start a conversation.
                  </p>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
