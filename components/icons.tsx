import React from 'react';
import {
  Gmail,
  GoogleMaps,
  GoogleChat,
  GoogleChrome,
  Github,
  GoogleDrive,
  GoogleCalendar2026,
  Slack,
  MicrosoftTeams,
  Todoist,
  Notion,
  Zoom,
  MicrosoftSharepoint,
  GoogleTasks2026,
  GoogleMeet2026,
  Firecrawl,
  Yelp,
  Here,
  GoogleDocs2026,
} from '@thesvg/react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

// Re-export basic names if needed, or wrap them
export function GmailIcon({ className, size = 24, ...props }: IconProps) {
  return <Gmail className={className} width={size} height={size} {...props} />;
}

export function GoogleMapsIcon({ className, size = 24, ...props }: IconProps) {
  return <GoogleMaps className={className} width={size} height={size} {...props} />;
}

export function GoogleChatIcon({ className, size = 24, ...props }: IconProps) {
  return <GoogleChat className={className} width={size} height={size} {...props} />;
}

export function GoogleChromeIcon({ className, size = 24, ...props }: IconProps) {
  return <GoogleChrome className={className} width={size} height={size} {...props} />;
}

export function GitHubIcon({ className, size = 24, ...props }: IconProps) {
  return <Github className={className} width={size} height={size} {...props} />;
}

export function GoogleDriveIcon({ className, size = 24, ...props }: IconProps) {
  return <GoogleDrive className={className} width={size} height={size} {...props} />;
}

export function GoogleCalendarIcon({ className, size = 24, ...props }: IconProps) {
  return <GoogleCalendar2026 className={className} width={size} height={size} {...props} />;
}

export function SlackIcon({ className, size = 24, ...props }: IconProps) {
  return <Slack className={className} width={size} height={size} {...props} />;
}

export function TeamsIcon({ className, size = 24, ...props }: IconProps) {
  return <MicrosoftTeams className={className} width={size} height={size} {...props} />;
}

export function TodoistIcon({ className, size = 24, ...props }: IconProps) {
  return <Todoist className={className} width={size} height={size} {...props} />;
}

export function NotionIcon({ className, size = 24, ...props }: IconProps) {
  return <Notion className={className} width={size} height={size} {...props} />;
}

export function ZoomIcon({ className, size = 24, ...props }: IconProps) {
  return <Zoom className={className} width={size} height={size} {...props} />;
}

export function SharePointIcon({ className, size = 24, ...props }: IconProps) {
  return <MicrosoftSharepoint className={className} width={size} height={size} {...props} />;
}

export function GoogleTasksIcon({ className, size = 24, ...props }: IconProps) {
  return <GoogleTasks2026 className={className} width={size} height={size} {...props} />;
}

export function GoogleMeetIcon({ className, size = 24, ...props }: IconProps) {
  return <GoogleMeet2026 className={className} width={size} height={size} {...props} />;
}

export function FirecrawlSvgIcon({ className, size = 24, ...props }: IconProps) {
  return <Firecrawl className={className} width={size} height={size} {...props} />;
}

export function YelpIcon({ className, size = 24, ...props }: IconProps) {
  return <Yelp className={className} width={size} height={size} {...props} />;
}

export function HereIcon({ className, size = 24, ...props }: IconProps) {
  return <Here className={className} width={size} height={size} {...props} />;
}

export function GoogleDocsIcon({ className, size = 24, ...props }: IconProps) {
  return <GoogleDocs2026 className={className} width={size} height={size} {...props} />;
}

export function GoogleContactsIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" {...props}>
      <rect width="24" height="24" rx="6" fill="#1A73E8"/>
      <circle cx="12" cy="9.5" r="3.5" fill="white"/>
      <path d="M6 19.5c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5" fill="white"/>
    </svg>
  );
}

// Handcrafted premium icons for specific services
export function LangdockIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg 
      viewBox="0 0 256 256" 
      width={size} 
      height={size} 
      className={className} 
      {...props}
    >
      <rect width="256" height="256" rx="60" fill="#10B981"/>
      <path 
        d="M60 196 C 75 140, 115 100, 150 100 C 180 100, 196 120, 196 140 C 196 170, 160 196, 120 196 C 85 196, 60 170, 60 140 C 60 100, 100 60, 150 60 C 175 60, 196 75, 196 90" 
        stroke="white" 
        strokeWidth="32" 
        strokeLinecap="round" 
        fill="none"
      />
    </svg>
  );
}

export function MinervaIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg 
      viewBox="0 0 256 256" 
      width={size} 
      height={size} 
      className={className} 
      {...props}
    >
      <rect width="256" height="256" rx="60" fill="#059669"/>
      <path 
        d="M60 196 C 75 140, 115 100, 150 100 C 180 100, 196 120, 196 140 C 196 170, 160 196, 120 196 C 85 196, 60 170, 60 140 C 60 100, 100 60, 150 60 C 175 60, 196 75, 196 90" 
        stroke="white" 
        strokeWidth="32" 
        strokeLinecap="round" 
        fill="none"
      />
    </svg>
  );
}

export function SanaIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className={className} 
      {...props}
    >
      <circle cx="50" cy="50" r="48" fill="#059669"/>
      <circle cx="50" cy="30" r="14" fill="white"/>
      <circle cx="50" cy="70" r="14" fill="white"/>
      <circle cx="30" cy="50" r="14" fill="white"/>
      <circle cx="70" cy="50" r="14" fill="white"/>
      <circle cx="50" cy="50" r="6" fill="#059669"/>
    </svg>
  );
}

export function MobbinIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 250 80"
      width={size}
      height={Math.round(size * 0.32)}
      className={className}
      {...props}
    >
      <path d="M22 60 V20 H34 L46 44 L58 20 H70 V60 H58 V40 L46 60 H42 L34 40 V60 H22 Z" fill="currentColor"/>
      <circle cx="95" cy="42" r="16" stroke="currentColor" strokeWidth="12" fill="none"/>
      <path d="M125 15 V60 H137 V48 C141 57 149 62 159 62 C175 62 187 49 187 32 C187 15 175 2 159 2 C149 2 141 7 137 16 V15 H125 Z M156 16 C166 16 173 24 173 32 C173 40 166 48 156 48 C146 48 139 40 139 32 C139 24 146 16 156 16 Z" fill="currentColor"/>
      <path d="M197 15 V60 H209 V48 C213 57 221 62 231 62 C247 62 259 49 259 32 C259 15 247 2 231 2 C221 2 213 7 209 16 V15 H197 Z M228 16 C238 16 245 24 245 32 C245 40 238 48 228 48 C218 48 211 40 211 32 C211 24 218 16 228 16 Z" fill="currentColor"/>
    </svg>
  );
}

export function ApifyIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" {...props}>
      <rect width="24" height="24" rx="6" fill="#1A73E8"/>
      <path d="M12 4L18 8V16L12 20L6 16V8L12 4Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
      <line x1="12" y1="4" x2="12" y2="9" stroke="white" strokeWidth="1.5"/>
      <line x1="12" y1="15" x2="12" y2="20" stroke="white" strokeWidth="1.5"/>
      <line x1="6" y1="8" x2="10.5" y2="10.5" stroke="white" strokeWidth="1.5"/>
      <line x1="13.5" y1="13.5" x2="18" y2="16" stroke="white" strokeWidth="1.5"/>
      <line x1="18" y1="8" x2="13.5" y2="10.5" stroke="white" strokeWidth="1.5"/>
      <line x1="10.5" y1="13.5" x2="6" y2="16" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}
