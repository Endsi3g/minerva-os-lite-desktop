import React from 'react';
import { 
  GmailIcon, 
  GoogleMapsIcon, 
  GoogleChatIcon, 
  GoogleChromeIcon, 
  GitHubIcon, 
  GoogleDriveIcon as CustomGoogleDriveIcon, 
  GoogleCalendarIcon as CustomGoogleCalendarIcon, 
  SlackIcon as CustomSlackIcon 
} from './icons/custom-svgs';

export { GmailIcon, GoogleMapsIcon, GoogleChatIcon, GoogleChromeIcon, GitHubIcon };

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function GoogleDriveIcon({ className, size = 24, ...props }: IconProps) {
  return <CustomGoogleDriveIcon className={className} size={size} {...props} />;
}

export function GoogleCalendarIcon({ className, size = 24, ...props }: IconProps) {
  return <CustomGoogleCalendarIcon className={className} size={size} {...props} />;
}

export function SharePointIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 450 500"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <defs>
        <radialGradient id="b" cx="-777.14" cy="770.84" r=".9" data-name="gradient 2" fx="-777.14" fy="770.84" gradientTransform="matrix(-98.02204 -236.87999 -426.55553 175.97802 252868.13 -319393.72)" gradientUnits="userSpaceOnUse">
          <stop offset=".29" stopColor="#003b5d"/><stop offset=".61" stopColor="#004a6c" stopOpacity=".69"/><stop offset=".97" stopColor="#006f94" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="c" cx="-785.23" cy="766.9" r=".9" data-name="gradient 3" fx="-785.23" fy="766.9" gradientTransform="matrix(-81.36865 -200.4872 -360.58286 145.8959 212855.73 -269057.38)" gradientUnits="userSpaceOnUse">
          <stop offset=".26" stopColor="#002a42"/><stop offset=".61" stopColor="#004261" stopOpacity=".69"/><stop offset=".97" stopColor="#006f94" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="d" cx="-739.84" cy="872.71" r=".9" data-name="gradient 4" fx="-739.84" fy="872.71" gradientTransform="matrix(-102.53313 149.24243 149.46801 102.38138 -206024.5 21094.22)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#78edff"/><stop offset="1" stopColor="#2ccfca" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="f" cx="-746.38" cy="743.75" r=".9" data-name="gradient 6" fx="-746.38" fy="743.75" gradientTransform="matrix(56.60729 -162.28035 -292.83982 -101.83188 260296.26 -45019.25)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#003b5d"/><stop offset=".49" stopColor="#004c6c" stopOpacity=".72"/><stop offset=".97" stopColor="#007a86" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="g" cx="-741.46" cy="888.91" r=".9" data-name="gradient 7" fx="-741.46" fy="888.91" gradientTransform="matrix(-85.44333 124.36732 124.55255 85.31498 -173675.69 16546.9)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#78edff"/><stop offset="1" stopColor="#2ccfca" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="j" cx="-686.6" cy="804.18" r=".9" data-name="gradient 10" fx="-686.6" fy="804.18" gradientTransform="matrix(222.887 222.57601 222.92613 -222.53738 -26208.17 332025.54)" gradientUnits="userSpaceOnUse">
          <stop offset=".06" stopColor="#00b6bd"/><stop offset=".89" stopColor="#00495c"/>
        </radialGradient>
        <radialGradient id="k" cx="-686.07" cy="864.41" r=".9" data-name="gradient 11" fx="-686.07" fy="864.41" gradientTransform="matrix(0 155.79 177.62 0 -153439.14 107241.64)" gradientUnits="userSpaceOnUse">
          <stop offset=".57" stopColor="#1e8581" stopOpacity="0"/><stop offset=".97" stopColor="#1ecbe6"/>
        </radialGradient>
        <linearGradient id="a" x1="92.18" x2="292.29" y1="477.48" y2="214.84" gradientTransform="matrix(1 0 0 -1 0 502)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00e3df"/><stop offset=".41" stopColor="#0097a8"/><stop offset="1" stopColor="#007791"/>
        </linearGradient>
        <linearGradient id="e" x1="245.14" x2="411.9" y1="331.57" y2="112.7" gradientTransform="matrix(1 0 0 -1 0 502)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00e3df"/><stop offset=".48" stopColor="#00a2b8"/><stop offset=".95" stopColor="#00637c"/>
        </linearGradient>
        <linearGradient id="h" x1="153.42" x2="259.71" y1="214.53" y2="1.97" gradientTransform="matrix(1 0 0 -1 0 502)" gradientUnits="userSpaceOnUse">
          <stop offset=".05" stopColor="#75fff6"/><stop offset=".51" stopColor="#00c7d1"/><stop offset=".96" stopColor="#0096ad"/>
        </linearGradient>
        <linearGradient id="i" x1="292.44" x2="235.63" y1="-12.27" y2="67.45" gradientTransform="matrix(1 0 0 -1 0 502)" gradientUnits="userSpaceOnUse">
          <stop offset=".26" stopColor="#0e5a5d"/><stop offset=".54" stopColor="#126c6b" stopOpacity=".69"/><stop offset=".97" stopColor="#1c948a" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d="M187.79 300c82.97 0 150.23-67.16 150.23-150S270.75 0 187.79 0 37.56 67.16 37.56 150s67.26 150 150.23 150Z" fill="url(#a)"/>
      <path d="M187.79 300c82.97 0 150.23-67.16 150.23-150S270.75 0 187.79 0 37.56 67.16 37.56 150s67.26 150 150.23 150Z" fill="url(#b)" fillOpacity={0.2}/>
      <path d="M187.79 300c82.97 0 150.23-67.16 150.23-150S270.75 0 187.79 0 37.56 67.16 37.56 150s67.26 150 150.23 150Z" fill="url(#c)" fillOpacity={0.31}/>
      <path d="M187.79 300c82.97 0 150.23-67.16 150.23-150S270.75 0 187.79 0 37.56 67.16 37.56 150s67.26 150 150.23 150Z" fill="url(#d)" fillOpacity={0.7}/>
      <path d="M324.81 400C393.95 400 450 344.04 450 275s-56.05-125-125.19-125-125.19 55.96-125.19 125 56.05 125 125.19 125Z" fill="url(#e)"/>
      <path d="M324.81 400C393.95 400 450 344.04 450 275s-56.05-125-125.19-125-125.19 55.96-125.19 125 56.05 125 125.19 125Z" fill="url(#f)" fillOpacity={0.5}/>
      <path d="M324.81 400C393.95 400 450 344.04 450 275s-56.05-125-125.19-125-125.19 55.96-125.19 125 56.05 125 125.19 125Z" fill="url(#g)" fillOpacity={0.7}/>
      <path d="M206.56 500c58.77 0 106.41-47.57 106.41-106.25S265.33 287.5 206.56 287.5s-106.41 47.57-106.41 106.25S147.79 500 206.56 500Z" fill="url(#h)"/>
      <path d="M206.56 500c58.77 0 106.41-47.57 106.41-106.25S265.33 287.5 206.56 287.5s-106.41 47.57-106.41 106.25S147.79 500 206.56 500Z" fill="url(#i)" fillOpacity={0.32}/>
      <rect width="200.3" height="200" y="237.5" rx="40.66" ry="40.66" fill="url(#j)"/>
      <rect width="200.3" height="200" y="237.5" rx="40.66" ry="40.66" fill="url(#k)" fillOpacity={0.6}/>
      <path d="m57 372.15 21.72-11.32c2.45 4.94 5.64 8.58 9.58 10.92 3.99 2.34 8.36 3.51 13.09 3.51 5.27 0 9.29-1.06 12.05-3.19 2.77-2.18 4.15-5.45 4.15-9.8 0-3.4-1.33-6.27-3.99-8.61-2.66-2.39-7.37-4.2-14.13-5.42-12.88-2.34-22.25-6.43-28.1-12.28-5.8-5.85-8.7-13.13-8.7-21.84 0-10.84 3.83-19.5 11.5-25.99 7.66-6.48 17.78-9.72 30.34-9.72 8.46 0 15.91 1.73 22.35 5.18 6.44 3.45 11.55 8.4 15.33 14.83l-21.23 10.92c-2.34-3.61-4.87-6.22-7.58-7.81-2.72-1.65-6.12-2.47-10.22-2.47-4.9 0-8.62 1.06-11.18 3.19-2.5 2.13-3.75 4.89-3.75 8.29 0 2.92 1.2 5.5 3.59 7.73 2.45 2.18 7.34 3.96 14.69 5.34 12.35 2.34 21.56 6.59 27.62 12.76 6.12 6.11 9.18 13.84 9.18 23.2 0 11.37-3.65 20.38-10.94 27.02-7.29 6.64-17.7 9.96-31.21 9.96-9.79 0-18.63-2.13-26.5-6.38-7.82-4.3-13.7-10.31-17.64-18.02Z" fill="#fff"/>
    </svg>
  );
}

export function ZoomIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      preserveAspectRatio="xMidYMid" 
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="zoom_a" x1="23.666%" x2="76.334%" y1="95.6118%" y2="4.3882%">
          <stop offset=".00006%" stopColor="#0845BF"/>
          <stop offset="19.11%" stopColor="#0950DE"/>
          <stop offset="38.23%" stopColor="#0B59F6"/>
          <stop offset="50%" stopColor="#0B5CFF"/>
          <stop offset="67.32%" stopColor="#0E5EFE"/>
          <stop offset="77.74%" stopColor="#1665FC"/>
          <stop offset="86.33%" stopColor="#246FF9"/>
          <stop offset="93.88%" stopColor="#387FF4"/>
          <stop offset="100%" stopColor="#4F90EE"/>
        </linearGradient>
      </defs>
      <path fill="url(#zoom_a)" d="M256 128c0 13.568-1.024 27.136-3.328 40.192-6.912 43.264-41.216 77.568-84.48 84.48C155.136 254.976 141.568 256 128 256c-13.568 0-27.136-1.024-40.192-3.328-43.264-6.912-77.568-41.216-84.48-84.48C1.024 155.136 0 141.568 0 128c0-13.568 1.024-27.136 3.328-40.192 6.912-43.264 41.216-77.568 84.48-84.48C100.864 1.024 114.432 0 128 0c13.568 0 27.136 1.024 40.192 3.328 43.264 6.912 77.568 41.216 84.48 84.48C254.976 100.864 256 114.432 256 128Z"/>
      <path fill="#FFF" d="M204.032 207.872H75.008c-8.448 0-16.64-4.608-20.48-12.032-4.608-8.704-2.816-19.2 4.096-26.112l89.856-89.856H83.968c-17.664 0-32-14.336-32-32h118.784c8.448 0 16.64 4.608 20.48 12.032 4.608 8.704 2.816 19.2-4.096 26.112l-89.6 90.112h74.496c17.664 0 32 14.08 32 31.744Z"/>
    </svg>
  );
}

import { MicrosoftTeamsIcon } from './icons/microsoft-teams';
export function TeamsIcon({ className, size = 24, ...props }: IconProps) {
  return <MicrosoftTeamsIcon className={className} width={size} height={size} {...props} />;
}

export function GoogleMeetIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <path fill="#00832d" d="M0 80v96c0 17.673 14.327 32 32 32h144l24-24-24-72-48-32H0Z"/>
      <path fill="#0066da" d="M248 56.666v142.668c0 14.729-15.962 23.945-28.718 16.582L176 189.988V208H32c-17.673 0-32-14.327-32-32V80c0-17.673 14.327-32 32-32h144v41.936l43.282-24.688C232.038 37.886 248 47.102 248 56.666Z"/>
      <path fill="#e94335" d="M176 48v80l43.282-24.688c12.756-7.363 28.718 1.853 28.718 16.582V56.666c0-14.729-15.962-23.945-28.718-16.582L176 48Z"/>
      <path fill="#2684fc" d="M0 80v96c0 17.673 14.327 32 32 32h144V48H32C14.327 48 0 62.327 0 80Z"/>
      <path fill="#ffba00" d="M176 100.8v89.188l43.282-24.688c12.756-7.363 12.756-25.799 0-33.162L176 100.8Z"/>
    </svg>
  );
}

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
      {/* Handcrafted clean wave ribbon matching the screenshot */}
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
      {/* Handcrafted clean wave ribbon in premium green */}
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

import { TodoistIcon as CustomTodoistIcon } from './icons/todoist';
export function TodoistIcon({ className, size = 24, ...props }: IconProps) {
  return <CustomTodoistIcon className={className} width={size} height={size} {...props} />;
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

export function NotionIcon({ className, size = 24, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" {...props}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.935-.234-1.495-.933l-4.577-7.19v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.284V9.197l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>
  );
}

export function SlackIcon({ className, size = 24, ...props }: IconProps) {
  return <CustomSlackIcon className={className} size={size} {...props} />;
}
