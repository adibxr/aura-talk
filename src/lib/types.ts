import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  profilePic: string | null;
  createdAt: Timestamp;
  lastActive: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  senderProfilePic: string | null;
  text: string;
  timestamp: Timestamp;
  reactions?: { [emoji: string]: string[] }; // emoji: list of user UIDs
  replyTo?: string; // message ID
}

export interface DirectMessage extends Message {
  receiverId: string;
  seen: boolean;
}

export interface Chat {
  id: string;
  members: string[];
  lastMessage: string | null;
  lastMessageTimestamp: Timestamp | null;
  updatedAt: Timestamp;
}
