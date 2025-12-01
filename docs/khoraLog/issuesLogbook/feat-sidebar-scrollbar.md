# Issue #?? - Custom Left-Aligned Scrollbar for Sidebar

## 📅 Timeline
- **Started**: 4:45 AM
- **Completed**: 5:14 AM
- **Duration**: ~29 minutes

## 🎯 The Quest
Add a custom left-aligned ultra-thin scrollbar to sidebar threads list matching Bandhu design.

## 🔍 Design Requirements
- **Position**: Left side (unusual but intentional)
- **Width**: Ultra-thin (4px - w-1)
- **Color**: Bandhu gradient (purple to blue)
- **Opacity**: Constant 60% (no hover effects)
- **Style**: Rounded and elegant

## 🛠️ Technical Implementation
**Custom scrollbar styling:**
```jsx
<div className="flex-1 overflow-y-auto 
  [&::-webkit-scrollbar]:w-1 
  [&::-webkit-scrollbar-track]:bg-transparent 
  [&::-webkit-scrollbar-thumb]:bg-gradient-to-br from-bandhu-primary/60 to-bandhu-secondary/60 
  [&::-webkit-scrollbar-thumb]:rounded-full 
  [direction:rtl]">
  <div className="[direction:ltr] pl-1">
    {/* content */}
  </div>
</div>