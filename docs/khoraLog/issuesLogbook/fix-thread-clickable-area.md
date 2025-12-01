# Issue #?? - Fix Thread Clickable Area

## 📅 Timeline
- **Started**: [Date] [Heure]  
- **Completed**: [Date] [Heure]
- **Duration**: ~?? minutes

## 🎯 The Quest
Eliminate subtle dead zones in thread card click targets for seamless sidebar interaction.

## 🔍 Problem Analysis  
**UX Issue:**
- Hover state activated before cursor change in thread cards
- Small inactive areas around clickable elements  
- Click only registered when cursor changed to pointer
- Broken interaction flow in sidebar navigation

**Root Cause:**
Thread card structure had:
- Clickable inner div with content
- Menu button in absolute positioning OUTSIDE clickable area
- This created dead zones where hover worked but click didn't

## 🛠️ Solution Implemented
**Restructured thread card layout:**
- Made entire card container clickable with `cursor-pointer`
- Moved menu button INSIDE clickable area with `stopPropagation`
- Used `pr-8` on content div for visual spacing only
- Maintained menu button functionality while fixing click targets

## 💡 Technical Changes
```jsx
// BEFORE: Separate clickable area
<div className="card">
  <div onClick={loadThread} className="cursor-pointer">
    {/* content */}
  </div>
  <div className="absolute top-2 right-2">
    {/* menu button - DEAD ZONE */}
  </div>
</div>

// AFTER: Unified clickable area  
<div className="card cursor-pointer" onClick={loadThread}>
  <div className="pr-8">
    {/* content */}
  </div>
  <div className="absolute top-2 right-2">
    <button onClick={e => e.stopPropagation()}>
      {/* menu button - NOW INSIDE */}
    </button>
  </div>
</div>