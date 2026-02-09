# Progress Screen UI Design Specification

## Overview
A minimalist, architectural-inspired progress screen featuring a stacked card design with depth perception. The interface uses subtle shadows, gradients, and scale variations to create visual hierarchy and a premium feel.

## Color Palette
- **Primary**: `#2F00FF` (vibrant purple)
- **Background Light**: `#f6f1ff` (very light lavender)
- **Background Dark**: `#130f23` (deep navy)
- **Card Background**: `#ffffff` (white) with varying opacity for depth
- **Text Primary**: `#121118` (near black)
- **Text Secondary**: `#888888` (gray)

## Typography
- **Font Family**: Spline Sans (fallback: BricolageGrotesque for React Native)
- **Heading Style**:
  - Font size: 30px
  - Font weight: 300 (light/thin)
  - Letter spacing: 0.2em (wide tracking)
  - Text transform: uppercase
- **Subtitle Style**:
  - Font size: 12px
  - Font weight: 600 (medium/bold)
  - Letter spacing: 0.15em (widest)
  - Text transform: uppercase
  - Color: Primary purple
- **Card Title**:
  - Font size: 22px (large card) to 18px (small card)
  - Font weight: 300 (thin)
  - Letter spacing: 0.05em
  - Text transform: uppercase
- **Card Badge**:
  - Font size: 10px
  - Font weight: 700 (bold)
  - Letter spacing: 0.1em (wider)
  - Text transform: uppercase
  - Color: Primary purple

## Shadow System
```
level-1 (subtle):
  - Drop: 8px 8px 16px rgba(47, 0, 255, 0.03)
  - Lift: -8px -8px 16px rgba(255, 255, 255, 0.8)
  - Inset: 1px 1px 2px rgba(255, 255, 255, 0.5)

level-2 (medium):
  - Drop: 12px 12px 24px rgba(47, 0, 255, 0.06)
  - Lift: -6px -6px 12px rgba(255, 255, 255, 1)
  - Border: 1px rgba(47, 0, 255, 0.02)

level-3 (prominent):
  - Drop: 16px 24px 48px rgba(47, 0, 255, 0.12)
  - Lift: -4px -4px 12px rgba(255, 255, 255, 0.9)

float (bottom nav):
  - 0 20px 60px -10px rgba(47, 0, 255, 0.15)

glow (ambient):
  - 0 0 120px 40px rgba(47, 0, 255, 0.08)
```

## Border Radius
- Default: 16px
- Large: 24px
- XL: 48px
- Full: 9999px (circles)

## Layout Structure

### Header (Fixed Top)
```
[Menu Button]                    [Search Button]
    (left)                           (right)

Both buttons:
- Size: 48px × 48px
- Background: white/40 opacity with backdrop blur
- Icon: Material Symbols Outlined
- Padding: 12px
- Shadow: soft
```

### Main Content (Scrollable)
```
Padding top: 12vh (viewport height based)
Padding bottom: 128px (for nav clearance)
Center aligned, max width: 448px (28rem)

1. Remmy Character Section
   - Circle container: 112px × 112px
   - Background: white
   - Shadow: level-2
   - Image: zero.png (contained, rounded)
   - Margin bottom: 24px

2. Title Section
   - "PROGRESS" (or "TASKS")
   - Font size: 30px, thin weight, ultra-wide tracking
   - Subtitle: "Afternoon View" or completion rate
   - Font size: 12px, bold, widest tracking, primary color

3. Task Cards Section (Stacked with Depth)
   - Cards decrease in width: 100% → 92% → 88% → 84% → 80%
   - Cards decrease in opacity: 100% → 90% → 80% → 60%
   - Cards increase in shadow intensity: level-3 → level-2 → level-1 → soft → none
   - Gap between cards: 24px
   - Hover effect: translate Y -4px, duration 300ms
```

### Bottom Navigation (Fixed Bottom)
```
Position: Absolute bottom, center aligned
Z-index: 30 (above content)
Padding bottom: 32px

Pill container:
- Background: white with backdrop blur
- Border: 1px solid rgba(47, 0, 255, 0.05)
- Border radius: full (pill shape)
- Padding: 8px left/right, 16px top/bottom
- Shadow: float

Navigation items (left to right):
1. Calendar icon button (inactive)
2. Add button (primary CTA)
3. Settings/Tune icon button (inactive)

CTA Button (Add):
- Size: 48px × 48px
- Background: Primary purple (#2F00FF)
- Icon: Plus (add)
- Shadow: 0 8px 24px rgba(47, 0, 255, 0.3)
- Hover: scale 1.05
- Active: scale 0.95
- Transition: transform 150ms

Side buttons:
- Size: 32px × 32px
- Color: #888888 (inactive)
- Hover: Primary purple
- Transition: color 200ms
```

## Card Design Patterns

### Priority 1: Overdue Task Card (Top Card)
```
Width: 100%
Background: White
Shadow: level-3
Border radius: 16px
Padding: 24px

Layout:
┌─────────────────────────────────────┐
│ [Corner gradient decoration]        │
│                                      │
│ OVERDUE 2H          [Arrow Button]  │
│ Submit Report              ◯         │
│                                      │
└─────────────────────────────────────┘

Badge:
- Text: "OVERDUE 2H"
- Font size: 10px, bold, wide tracking
- Color: Primary purple
- Position: Top left

Title:
- Font size: 24px, thin weight
- Letter spacing: 0.05em
- Text transform: uppercase

Action Button:
- Size: 40px × 40px
- Background: Primary purple
- Icon: arrow_forward
- Shadow: 0 4px 16px rgba(47, 0, 255, 0.3)
- Border radius: full

Corner Decoration:
- Size: 96px × 96px
- Gradient: radial from top-right
- Colors: primary/5 to transparent
- Position: absolute top-right
```

### Priority 2: Urgent Task Card (Second Card)
```
Width: 92%
Background: White
Shadow: level-2
Border radius: 16px
Padding: 20px

Layout:
┌──────────────────────────────────┐
│ Call Architect          [Icon]   │
│ 10:00 AM                   ☎     │
└──────────────────────────────────┘

Title:
- Font size: 18px, thin weight
- Letter spacing: 0.05em

Time Badge:
- Font size: 10px, bold, widest tracking
- Color: Primary purple

Action Icon:
- Size: 32px × 32px
- Background: light gray (#f8f8f8)
- Icon color: #888888
- Hover: Icon becomes primary color
- Border radius: full
```

### Priority 3: Standard Task Card (Third Card)
```
Width: 88%
Background: White
Shadow: level-1
Border radius: 16px
Padding: 20px

Layout:
┌──────────────────────────────────┐
│ Buy Milk                 [ ]     │
│ 5:00 PM                          │
└──────────────────────────────────┘

Checkbox:
- Size: 24px × 24px
- Border: 2px solid #e5e5e5
- Border radius: full
- Hover: Border becomes primary color
```

### Priority 4: Upcoming Task Card (Fourth Card)
```
Width: 84%
Background: White
Shadow: soft
Border radius: 16px
Padding: 20px
Opacity: 90%

Layout:
┌──────────────────────────────────┐
│ Review Portfolio    [👤][+1]     │
│ TOMORROW                         │
└──────────────────────────────────┘

Collaborator Avatars:
- Size: 24px × 24px
- Border: 2px solid white
- Overlap: -8px (negative margin)
- Border radius: full
```

### Priority 5: Future Task Card (Fifth Card)
```
Width: 80%
Background: White/50 (50% opacity)
Shadow: none
Border radius: 16px
Padding: 20px
Opacity: 60%
Backdrop blur: medium

Layout:
┌──────────────────────────────────┐
│ Pick up Laundry                  │
│ FRIDAY                           │
└──────────────────────────────────┘
```

## Animations & Interactions

### Card Hover
```
- Transform: translateY(-4px)
- Duration: 300ms
- Easing: ease-out
- Shadow: Increase intensity by 20%
```

### Button Press
```
Active (pressed):
- Transform: scale(0.95)
- Duration: 100ms
- Easing: ease-in-out

Released:
- Transform: scale(1)
- Duration: 100ms
- Easing: ease-in-out
```

### Button Hover (CTA)
```
- Transform: scale(1.05)
- Duration: 150ms
- Easing: ease-out
- Shadow: Increase intensity
```

### Card Entry Animation
```
Initial state:
- Opacity: 0
- Transform: translateY(20px)

Final state:
- Opacity: 1
- Transform: translateY(0)

Stagger delay: 80ms per card
Duration: 400ms
Easing: ease-out
```

## Background Effects

### Light Source (Top Right)
```
Position: Absolute top -160px, right -160px
Gradient: Radial circle
Colors: rgba(47,0,255,0.05) 0% → transparent 40%
Opacity: 90%
Size: 320px × 320px
```

### Deep Glow (Bottom Left)
```
Position: Absolute bottom -120px, left -120px
Gradient: Radial circle
Colors: rgba(47,0,255,0.08) 0% → transparent 60%
Size: 240px × 240px
```

## Data Structure

### Reminder Card Props
```typescript
interface ReminderCard {
  id: string;
  title: string;
  scheduledTime: string; // ISO string
  priority: 1 | 2 | 3 | 4 | 5; // Determines card size & style
  isOverdue: boolean;
  overdueBy?: string; // "2H", "1D", etc.
  actionType?: 'call' | 'link' | 'location' | 'email' | 'default';
  collaborators?: string[]; // Avatar URLs
  status: 'pending' | 'completed';
}
```

### Card Priority Mapping
```
Priority 1: Top card, 100% width, level-3 shadow, overdue indicator
Priority 2: 92% width, level-2 shadow, action icon
Priority 3: 88% width, level-1 shadow, checkbox
Priority 4: 84% width, soft shadow, 90% opacity, collaborators
Priority 5: 80% width, no shadow, 60% opacity, blur
```

## Action Icons by Task Type

### Quick Action Icons
```
call → phone icon
link → link/open_in_new icon
location → location_on icon
email → mail icon
default → arrow_forward icon
```

### Icon Styling
```
Size: 20px (inside 32-40px container)
Color: Inactive #888888, Active/Hover #2F00FF
Background: Light gray (#f8f8f8) or primary with alpha
Transition: All properties 200ms
```

## Accessibility

### Touch Targets
- Minimum: 44px × 44px for all interactive elements
- Cards: Full card area is tappable
- Buttons: Clear visual feedback on press

### Labels
```
Card: "Task: [title], scheduled for [time], [status]"
Action button: "[Action type] for [task title]"
Checkbox: "Mark [task title] as complete"
Add button: "Create new reminder"
Nav buttons: "View calendar", "Open settings"
```

### States
```
Normal → Hover → Active → Disabled
Each state has distinct visual feedback
Disabled: 40% opacity, no pointer events
```

## Responsive Behavior

### Screen Sizes
```
Mobile (default): Max width 448px
Tablet: Max width 640px, increase padding
Desktop: Max width 768px, larger cards
```

### Scrolling
```
- Smooth scroll behavior
- Hide scrollbar (still functional)
- Bounce effect on overscroll
- Header/nav remain fixed during scroll
```

## Implementation Notes

### React Native Equivalents
```
backdrop-blur → BlurView from expo-blur
shadow → elevation (Android) + shadow props (iOS)
hover → onPressIn/onPressOut animations
Material Symbols → @expo/vector-icons MaterialIcons
Tailwind classes → StyleSheet with theme values
```

### Performance
```
- Use FlatList for large task lists (>10 items)
- Memoize card components with React.memo
- Use Animated.FlatList for stagger animations
- Lazy load images and icons
- Debounce search input
```

### State Management
```
- Local state for UI interactions (hover, press)
- Global state for tasks data (context or zustand)
- Real-time sync with Supabase subscriptions
- Optimistic UI updates for instant feedback
```

## Analytics Integration

### Display in Header Subtitle
```
Instead of "Afternoon View":
- "{completionRate}% completion rate"
- "{currentStreak} day streak"
- "All caught up!" (when overdueCount === 0)
```

### Remmy Messages
```
Position: Below Remmy character, above cards
Style: Speech bubble with tail pointing to Remmy
Content: Dynamic based on user performance
Max width: 80% of screen
```

---

# Manual Reminder Creation Screen Enhancement

## Task Configuration Section (NEW)

### Location in Screen
```
Position: Below time picker, above description field
Initially: Collapsed
Toggle: Animated expansion/collapse
```

### Header Design
```
┌─────────────────────────────────────┐
│ Task Configuration           [▼]    │
└─────────────────────────────────────┘

Header:
- Font size: 14px, medium weight
- Color: #888888
- Padding: 16px
- Border bottom: 1px solid #f0f0f0
- Chevron rotates 180° when expanded
- Haptic feedback on toggle
```

### Expanded Content
```
┌─────────────────────────────────────┐
│ Task Configuration           [▲]    │
├─────────────────────────────────────┤
│                                      │
│ QUICK ACTIONS                        │
│                                      │
│ [📞 Call]  [🔗 Link]  [📍 Location] │
│                                      │
│ [📧 Email] [📄 Note]  [👥 Assign]   │
│                                      │
│ ─────────────────────────────────   │
│                                      │
│ REPEAT                               │
│ [ ] Daily  [ ] Weekly  [ ] Custom   │
│                                      │
│ ─────────────────────────────────   │
│                                      │
│ ATTACHMENTS                          │
│ [+ Add file, photo, or link]        │
│                                      │
└─────────────────────────────────────┘
```

### Quick Action Buttons

#### Button Grid Layout
```
Grid: 3 columns
Gap: 12px
Padding: 16px
```

#### Button Design
```
Size: Flexible width, 48px height
Background: White
Border: 1px solid #e5e5e5
Border radius: 12px
Shadow: soft

Layout:
┌──────────────┐
│ 📞  Call     │
└──────────────┘

Icon:
- Size: 20px
- Position: Left, 12px from edge
- System emoji or Material icon

Label:
- Font size: 14px
- Font weight: 500
- Color: #121118
- Margin left: 8px from icon

States:
- Default: Border #e5e5e5
- Hover: Border #2F00FF, slight scale
- Active: Background #f6f1ff, border #2F00FF
- Selected: Background #2F00FF, text white
```

### Quick Actions List

#### 1. Call
```
Icon: 📞 phone
Action: Save phone number field
Opens: Phone number input
Stores: { type: 'call', value: '+1234567890' }
Display: Shows "Call [number]" on card
On tap reminder: Opens phone dialer
```

#### 2. Link
```
Icon: 🔗 link
Action: Save URL field
Opens: URL input with validation
Stores: { type: 'link', value: 'https://...' }
Display: Shows "Open link" on card
On tap reminder: Opens browser/in-app
```

#### 3. Location
```
Icon: 📍 location_on
Action: Save address/coordinates
Opens: Map picker or address input
Stores: { type: 'location', value: 'address', lat, lng }
Display: Shows "Navigate to [place]" on card
On tap reminder: Opens maps app
```

#### 4. Email
```
Icon: 📧 email
Action: Save email address
Opens: Email input with validation
Stores: { type: 'email', value: 'user@email.com', subject?, body? }
Display: Shows "Email [contact]" on card
On tap reminder: Opens email composer
```

#### 5. Note
```
Icon: 📄 description
Action: Add detailed note/checklist
Opens: Rich text editor or checklist builder
Stores: { type: 'note', value: 'markdown text' }
Display: Shows note snippet on expand
On tap: Shows full note in modal
```

#### 6. Assign
```
Icon: 👥 people
Action: Share task with others
Opens: Contact selector
Stores: { type: 'assign', value: ['user_id_1', 'user_id_2'] }
Display: Shows avatars on card
On tap: Opens collaboration view
```

#### 7. Photo (Additional)
```
Icon: 📷 photo_camera
Action: Attach photo/screenshot
Opens: Camera or photo library
Stores: { type: 'photo', value: 'storage_url' }
Display: Thumbnail on card
On tap: Full screen view
```

#### 8. Voice Note (Additional)
```
Icon: 🎤 mic
Action: Record voice memo
Opens: Audio recorder
Stores: { type: 'voice', value: 'audio_url', duration }
Display: Waveform + duration
On tap: Play audio
```

#### 9. Subtasks (Additional)
```
Icon: ✓ checklist
Action: Add checklist items
Opens: Subtask list builder
Stores: { type: 'subtasks', value: [{title, done}] }
Display: "2/5 subtasks completed"
On tap: Show subtask list
```

### Repeat Section

#### Design
```
REPEAT
[ ] Daily  [ ] Weekly  [ ] Custom

Buttons: Toggle style
Active background: #2F00FF
Active text: White
Inactive background: White
Inactive text: #888888
Inactive border: #e5e5e5
```

#### Custom Repeat Modal
```
Opens when "Custom" selected
Options:
- Frequency: Every [X] [days/weeks/months]
- Days of week: M T W T F S S
- End condition: Never / After X times / On date
- Advanced: Skip weekends, holidays
```

### Attachments Section

#### Design
```
ATTACHMENTS
┌─────────────────────────────────────┐
│ [+] Add file, photo, or link        │
└─────────────────────────────────────┘

Button:
- Full width
- Height: 44px
- Dashed border: 2px #e5e5e5
- Border radius: 12px
- Text: #888888
- Icon: + (plus) on left
```

#### Attachment Types
```
1. File: Opens file picker
2. Photo: Opens camera/gallery
3. Link: Opens URL input
4. Voice: Records audio

Display attached items as chips:
[📄 Report.pdf] [×]
[🔗 google.com] [×]
```

### Animation Specifications

#### Expand/Collapse
```
Initial height: 0 (collapsed)
Final height: auto (measured)
Duration: 300ms
Easing: ease-in-out

Opacity:
- Collapsed: 0
- Expanded: 1
- Duration: 200ms (faster than height)

Chevron rotation:
- Collapsed: 0deg
- Expanded: 180deg
- Duration: 300ms
```

#### Button Selection
```
Scale:
- Press: 0.95
- Release: 1
- Duration: 100ms

Background color:
- Transition: 200ms
- From: white → To: primary

Border color:
- Transition: 200ms
- From: #e5e5e5 → To: primary
```

### Data Schema

#### Reminder with Actions
```typescript
interface ReminderAction {
  type: 'call' | 'link' | 'location' | 'email' | 'note' | 'assign' | 'photo' | 'voice' | 'subtasks';
  value: string | object;
  metadata?: {
    label?: string;
    icon?: string;
    [key: string]: any;
  };
}

interface Reminder {
  id: string;
  title: string;
  description?: string;
  scheduled_time: string;
  actions: ReminderAction[]; // NEW
  repeat?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    daysOfWeek?: number[];
    endDate?: string;
    endAfter?: number;
  }; // NEW
  attachments?: {
    type: 'file' | 'photo' | 'link' | 'voice';
    url: string;
    name: string;
    size?: number;
  }[]; // NEW
  // ... existing fields
}
```

### Database Schema Updates

#### New Table: reminder_actions
```sql
CREATE TABLE reminder_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'call', 'link', 'location', etc.
  action_value JSONB NOT NULL, -- Flexible storage for different action types
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminder_actions_reminder_id ON reminder_actions(reminder_id);
```

#### New Table: reminder_repeat_rules
```sql
CREATE TABLE reminder_repeat_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  interval INTEGER DEFAULT 1,
  days_of_week INTEGER[], -- 0=Sunday, 6=Saturday
  end_date DATE,
  end_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminder_repeat_rules_reminder_id ON reminder_repeat_rules(reminder_id);
```

#### New Table: reminder_attachments
```sql
CREATE TABLE reminder_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL, -- 'file', 'photo', 'link', 'voice'
  storage_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminder_attachments_reminder_id ON reminder_attachments(reminder_id);
```

### Usage Examples

#### Example 1: Call Reminder
```typescript
{
  title: "Call Dr. Smith",
  scheduled_time: "2026-02-10T14:00:00Z",
  actions: [
    {
      type: 'call',
      value: '+15551234567',
      metadata: { label: 'Dr. Smith Office' }
    }
  ]
}

// Card displays: [📞] Call Dr. Smith
// On tap: Opens phone dialer with number pre-filled
```

#### Example 2: Shopping with Location
```typescript
{
  title: "Buy groceries",
  scheduled_time: "2026-02-10T17:00:00Z",
  actions: [
    {
      type: 'location',
      value: 'Whole Foods Market',
      metadata: {
        address: '123 Main St',
        lat: 37.7749,
        lng: -122.4194
      }
    },
    {
      type: 'subtasks',
      value: [
        { title: 'Milk', done: false },
        { title: 'Bread', done: false },
        { title: 'Eggs', done: false }
      ]
    }
  ]
}

// Card displays: [📍] Buy groceries • 0/3 items
// On tap location: Opens maps
// On expand: Shows checklist
```

#### Example 3: Work Report with Multiple Actions
```typescript
{
  title: "Submit quarterly report",
  scheduled_time: "2026-02-15T09:00:00Z",
  actions: [
    {
      type: 'link',
      value: 'https://docs.company.com/q4-report',
      metadata: { label: 'Report template' }
    },
    {
      type: 'email',
      value: 'manager@company.com',
      metadata: {
        subject: 'Q4 Report',
        body: 'Please find attached...'
      }
    },
    {
      type: 'note',
      value: '## Important points\n- Revenue up 12%\n- New clients: 45'
    }
  ],
  attachments: [
    {
      type: 'file',
      url: 'storage://reports/q4.pdf',
      name: 'Q4_Report.pdf',
      size: 2048000
    }
  ]
}

// Card displays: [🔗][📧][📄] Submit quarterly report
// Shows multiple action buttons
// On tap link: Opens document
// On tap email: Opens composer
// On expand: Shows notes and attachment
```

## Summary

This specification provides a complete blueprint for implementing:
1. **Progress Screen**: Architectural stacked card design with depth perception
2. **Task Configuration**: Collapsible section with 9+ quick actions
3. **Data Schema**: Database structure for actions, repeats, and attachments
4. **Interactions**: Animations, touch feedback, and accessibility
5. **Integration**: How actions integrate with existing reminder system

The design prioritizes:
- Visual hierarchy through size, shadow, and opacity
- Minimalism without sacrificing functionality
- Smooth, delightful animations
- Accessible touch targets and labels
- Extensible architecture for future actions
