import Svg, { Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export function AddButtonIcon() {
  return (
    <Svg width={49} height={49} viewBox="0 0 16 16" fill="#2F00FF">
      <Path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z" />
    </Svg>
  );
}

export function CloseButtonIcon() {
  return (
    <Svg width={49} height={49} viewBox="0 0 16 16" fill="#2F00FF">
      <Path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z" />
    </Svg>
  );
}

export function SparklesIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <G fill="none">
        <Path d="M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z" />
        <Path
          fill="#2F00FF"
          d="M19.07 12.01a1 1 0 0 1 .85 1.132A8.004 8.004 0 0 1 13 19.938V21a1 1 0 1 1-2 0v-1.062a8.005 8.005 0 0 1-6.919-6.796 1 1 0 0 1 1.98-.284 6.001 6.001 0 0 0 11.878 0 1 1 0 0 1 1.132-.848M12 2c.819 0 1.592.197 2.274.546a3 3 0 0 0 .757 5.293l.378.13a1 1 0 0 1 .623.622l.129.378c.17.5.464.932.839 1.267V12a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5m7-1a1 1 0 0 1 .898.56l.048.117.13.378a3 3 0 0 0 1.684 1.8l.185.07.378.129a1 1 0 0 1 .118 1.844l-.118.048-.378.13a3 3 0 0 0-1.8 1.684l-.07.185-.129.378a1 1 0 0 1-1.844.117l-.048-.117-.13-.378a3 3 0 0 0-1.684-1.8l-.185-.07-.378-.129a1 1 0 0 1-.118-1.844l.118-.048.378-.13a3 3 0 0 0 1.8-1.684l.07-.185.129-.378A1 1 0 0 1 19 1"
        />
      </G>
    </Svg>
  );
}

export function PlusCircleIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8V16M8 12H16"
        stroke="#9CA3AF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="#9CA3AF"
        strokeWidth={2}
      />
    </Svg>
  );
}

export function CalendarIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M16 2V6M8 2V6" stroke="#3B82F6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z"
        stroke="#3B82F6"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 10H21" stroke="#3B82F6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M11 14H16M8 14H8.00898M13 18H8M16 18H15.991"
        stroke="#3B82F6"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NotificationIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd">
        <Path d="M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z" />
        <Path
          fill="#3B82F6"
          d="M5 9a7 7 0 0 1 14 0v3.764l1.822 3.644A1.1 1.1 0 0 1 19.838 18h-3.964a4.002 4.002 0 0 1-7.748 0H4.162a1.1 1.1 0 0 1-.984-1.592L5 12.764zm5.268 9a2 2 0 0 0 3.464 0zM12 4a5 5 0 0 0-5 5v3.764a2 2 0 0 1-.211.894L5.619 16h12.763l-1.17-2.342a2.001 2.001 0 0 1-.212-.894V9a5 5 0 0 0-5-5"
        />
      </G>
    </Svg>
  );
}

export function TimelineNavIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M3,14L3.5,14.07L8.07,9.5C7.89,8.85 8.06,8.11 8.59,7.59C9.37,6.8 10.63,6.8 11.41,7.59C11.94,8.11 12.11,8.85 11.93,9.5L14.5,12.07L15,12C15.18,12 15.35,12 15.5,12.07L19.07,8.5C19,8.35 19,8.18 19,8A2,2 0 0,1 21,6A2,2 0 0,1 23,8A2,2 0 0,1 21,10C20.82,10 20.65,10 20.5,9.93L16.93,13.5C17,13.65 17,13.82 17,14A2,2 0 0,1 15,16A2,2 0 0,1 13,14L13.07,13.5L10.5,10.93C10.18,11 9.82,11 9.5,10.93L4.93,15.5L5,16A2,2 0 0,1 3,18A2,2 0 0,1 1,16A2,2 0 0,1 3,14Z"
        fill={color}
        stroke={color}
      />
    </Svg>
  );
}

export function BellNavIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21"
        fill={color}
        stroke={color}
      />
    </Svg>
  );
}

export function GlowTopRight() {
  return (
    <Svg width={520} height={520}>
      <Defs>
        <RadialGradient id="glowTopRight" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#8fb9ff" stopOpacity={0.18} />
          <Stop offset="55%" stopColor="#8fb9ff" stopOpacity={0.08} />
          <Stop offset="100%" stopColor="#8fb9ff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="520" height="520" fill="url(#glowTopRight)" />
    </Svg>
  );
}

export function GlowBottomLeft() {
  return (
    <Svg width={360} height={360}>
      <Defs>
        <RadialGradient id="glowBottomLeft" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#a78bfa" stopOpacity={0.14} />
          <Stop offset="60%" stopColor="#a78bfa" stopOpacity={0.07} />
          <Stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="360" height="360" fill="url(#glowBottomLeft)" />
    </Svg>
  );
}

export function BackIcon({ color = '#121018' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19L8 12L15 5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ScheduleIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12S17.5 2 12 2M12.5 12.2L9.8 17L8.5 16.2L11 11.8V7H12.5V12.2Z"
        fill={color}
        stroke={color}
      />
    </Svg>
  );
}

export function CheckAllIcon({ color = '#ffffff' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 7L9.42857 17L6 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 7L13.4286 17L12 15.3333"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CalendarSmallIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1"
        fill={color}
        stroke={color}
      />
    </Svg>
  );
}

export function AutoAwesomeIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
      <Path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
    </Svg>
  );
}

export function EditNoteIcon({ color = '#2F00FF', opacity = 0.4 }: { color?: string; opacity?: number }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
        fill={color}
        fillOpacity={opacity}
      />
    </Svg>
  );
}

export function RepeatIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z"
        fill={color}
        stroke={color}
      />
    </Svg>
  );
}

export function ChevronRightIcon({ color = '#2F00FF', opacity = 0.4 }: { color?: string; opacity?: number }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18L15 12L9 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={opacity}
      />
    </Svg>
  );
}

export function CloseIcon({ color = '#121018', size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6L18 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BlockIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 12 12" fill={color}>
      <Path d="M6 0a6 6 0 1 1 0 12A6 6 0 0 1 6 0Zm3 5H3v2h6Z" />
    </Svg>
  );
}

export function DailyIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 256 256" fill={color}>
      <Path d="M164,72a76.2,76.2,0,0,0-20.26,2.73,55.63,55.63,0,0,0-9.41-11.54l9.51-13.57a8,8,0,1,0-13.11-9.18L121.22,54A55.9,55.9,0,0,0,96,48c-.59,0-1.16,0-1.74,0L91.37,31.71a8,8,0,1,0-15.75,2.77L78.5,50.82A56.1,56.1,0,0,0,55.23,65.67L41.61,56.14a8,8,0,1,0-9.17,13.11L46,78.77A55.55,55.55,0,0,0,40,104c0,.57,0,1.15,0,1.72L23.71,108.6a8,8,0,0,0,1.38,15.88,8.24,8.24,0,0,0,1.39-.12l16.32-2.88a55.74,55.74,0,0,0,5.86,12.42A52,52,0,0,0,84,224h80a76,76,0,0,0,0-152ZM92.92,120.76a52.14,52.14,0,0,0-31,4.17,40,40,0,0,1,66.62-44.17A76.26,76.26,0,0,0,92.92,120.76Z" />
    </Svg>
  );
}

export function CalendarWeekIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 2V6M8 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 14H16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BookmarkIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M15,5A2,2 0 0,1 17,7V23L10,20L3,23V7C3,5.89 3.9,5 5,5H15M9,1H19A2,2 0 0,1 21,3V19L19,18.13V3H7A2,2 0 0,1 9,1Z"
        fill={color}
        stroke={color}
      />
    </Svg>
  );
}

export function AccountSettingsIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14M7,22H9V24H7V22M11,22H13V24H11V22M15,22H17V24H15V22Z"
        fill={color}
        stroke={color}
      />
    </Svg>
  );
}

export function SlidersIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 16 16" fill={color}>
      <Path d="M15 2.75a.75.75 0 0 1-.75.75h-4a.75.75 0 0 1 0-1.5h4a.75.75 0 0 1 .75.75Zm-8.5.75v1.25a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-1.5 0V2H1.75a.75.75 0 0 0 0 1.5H6.5Zm1.25 5.25a.75.75 0 0 0 0-1.5h-6a.75.75 0 0 0 0 1.5h6ZM15 8a.75.75 0 0 1-.75.75H11.5V10a.75.75 0 1 1-1.5 0V6a.75.75 0 0 1 1.5 0v1.25h2.75A.75.75 0 0 1 15 8Zm-9 5.25v-2a.75.75 0 0 0-1.5 0v1.25H1.75a.75.75 0 0 0 0 1.5H4.5v1.25a.75.75 0 0 0 1.5 0v-2Zm9 0a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1 0-1.5h6a.75.75 0 0 1 .75.75Z" />
    </Svg>
  );
}

export function CheckCircleIcon({ color = '#2F00FF' }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01L9 11.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function KeyboardIcon({ color = '#5e5e8d' }: { color?: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7.5C3 6.11929 4.11929 5 5.5 5H18.5C19.8807 5 21 6.11929 21 7.5V16.5C21 17.8807 19.8807 19 18.5 19H5.5C4.11929 19 3 17.8807 3 16.5V7.5Z"
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M7 10H9M11 10H13M15 10H17M7 14H10M12 14H17"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function HistoryIcon({ color = '#5e5e8d' }: { color?: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6V12L15.5 13.8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 12a8 8 0 1 0 2.3-5.7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M4 4v4h4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StopIcon({ color = '#ffffff' }: { color?: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 7H17V17H7V7Z"
        fill={color}
      />
    </Svg>
  );
}

export function WaveIcon({ color = 'rgba(255,255,255,0.45)' }: { color?: string }) {
  return (
    <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12C6.5 9.5 8 9.5 9.5 12C11 14.5 12.5 14.5 14 12C15.5 9.5 17 9.5 19 12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MicSparkleIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none">
        <Path d="M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z" />
        <Path
          fill="#2F00FF"
          d="M19.07 12.01a1 1 0 0 1 .85 1.132A8.004 8.004 0 0 1 13 19.938V21a1 1 0 1 1-2 0v-1.062a8.005 8.005 0 0 1-6.919-6.796 1 1 0 0 1 1.98-.284 6.001 6.001 0 0 0 11.878 0 1 1 0 0 1 1.132-.848M12 2c.819 0 1.592.197 2.274.546a3 3 0 0 0 .757 5.293l.378.13a1 1 0 0 1 .623.622l.129.378c.17.5.464.932.839 1.267V12a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5m7-1a1 1 0 0 1 .898.56l.048.117.13.378a3 3 0 0 0 1.684 1.8l.185.07.378.129a1 1 0 0 1 .118 1.844l-.118.048-.378.13a3 3 0 0 0-1.8 1.684l-.07.185-.129.378a1 1 0 0 1-1.844.117l-.048-.117-.13-.378a3 3 0 0 0-1.684-1.8l-.185-.07-.378-.129a1 1 0 0 1-.118-1.844l.118-.048.378-.13a3 3 0 0 0 1.8-1.684l.07-.185.129-.378A1 1 0 0 1 19 1"
        />
      </G>
    </Svg>
  );
}

export function GiftIcon({ color = '#6B7FA0' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12V22H4V12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 7H2V12H22V7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 22V7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 7H7.5C6.83696 7 6.20107 6.73661 5.73223 6.26777C5.26339 5.79893 5 5.16304 5 4.5C5 3.83696 5.26339 3.20107 5.73223 2.73223C6.20107 2.26339 6.83696 2 7.5 2C11 2 12 7 12 7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 7H16.5C17.163 7 17.7989 6.73661 18.2678 6.26777C18.7366 5.79893 19 5.16304 19 4.5C19 3.83696 18.7366 3.20107 18.2678 2.73223C17.7989 2.26339 17.163 2 16.5 2C13 2 12 7 12 7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MicIcon({ color = '#ffffff', size = 26 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
        fill={color}
      />
      <Path
        d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 19V23M8 23H16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SendIcon({ color = '#ffffff', size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
