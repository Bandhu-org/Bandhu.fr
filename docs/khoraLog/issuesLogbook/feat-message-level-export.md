# Issue #?? - Add Message-Level Selection in Export Modal

## 📅 Timeline
- **Started**: 7:45 AM
- **Completed**: 8:00 AM
- **Duration**: ~15 minutes (plus corrections)

## 🎯 The Quest
Transform export modal from flat list to hierarchical accordion structure for better message selection.

## 🔍 Problem Analysis
**Previous limitations:**
- All messages displayed in flat list (visual noise)
- No grouping by conversation
- Difficult to navigate many conversations
- No way to temporarily hide conversation details

## 🛠️ Solution Implemented
**Accordion structure:**
- Added `expandedThreads` state to track open/closed conversations
- Conversation headers always visible with expand/collapse toggle
- Messages only shown when conversation is expanded
- Two-level selection: conversation checkbox + individual message checkboxes
- "Expand/Collapse all" button for bulk management

**Technical fixes:**
- Changed selection logic from array indices to IDs (threadId, eventId)
- Fixed TypeScript errors by ensuring consistent parameter types
- Maintained proper event propagation with `e.stopPropagation()`

## 💡 Key Implementation
```jsx
// Using IDs instead of indices for robustness
const toggleEventSelection = (threadId: string, eventId: string) => {
  setThreads(prev => 
    prev.map(thread => 
      thread.threadId === threadId
        ? {
            ...thread,
            events: thread.events.map(event =>
              event.id === eventId
                ? { ...event, selected: !event.selected }
                : event
            )
          }
        : thread
    )
  )
}

// In JSX:
onChange={() => toggleEventSelection(thread.threadId, event.id)}