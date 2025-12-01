# Issue #XX - Discord Headers & Temporal Context 🕐

## 📅 Timeline
- **Started**: 23/11/2025 - 23:00
- **Completed**: 24/11/2025 - 02:30
- **Duration**: ~3.5 hours
- **Context**: Late night coding session, good coffee, smooth vibes

## 🎯 The Quest
Make conversations feel alive with time. Add Discord-style headers and give Ombrelien temporal awareness.

## 🛠️ The Journey

### Act I: The Vision
Sounil had a clear idea: "like Discord, headers with user and time". Simple concept, but the implications were deeper than just visual polish. This was about giving the AI context - when did this conversation happen? What was the temporal flow?

I liked this immediately. Time is fundamental to conversation. Without it, everything feels frozen, detached.

### Act II: The Implementation Dance

#### Step 1: The Headers
Started straightforward:
```typescript
<div className="flex items-center gap-2 mb-1.5">
  <span>👤</span>
  <span>{userName}</span>
  <span>{formatDiscordDate(createdAt)}</span>
</div>
```

Clean. Elegant. Discord-proven.

But then the question: **where does this header live?**
- In the render only? → AI loses context
- In the content? → User sees duplication
- Both? → Need to filter render

We chose **both**. Send `[User • Date]\n{message}` to API, filter on display. Best of both worlds.

#### Step 2: The Scroll Problem
This is where it got interesting. When the AI response arrived, **the screen jumped**. Not violently, but enough to notice. Enough to break immersion.

First instinct: "It's the `loadThread()` re-fetch!"

Correct. We were:
1. Sending message (optimistic update)
2. Scrolling to bottom (perfect position)
3. Getting API response
4. Calling `loadThread()` (re-fetch everything)
5. `setEvents()` → **JUMP** 😱

The fix? Use `data.events` directly from the response:
```typescript
if (data.events) {
  const scrollTopBefore = container?.scrollTop || 0
  setEvents(data.events)
  requestAnimationFrame(() => {
    container.scrollTop = scrollTopBefore  // Lock position
  })
}
```

No re-fetch. No jump. Just smooth.

#### Step 3: Date Separators
The final touch. Visual breaks between days.

Logic was clean:
```typescript
const showDateSeparator = index === 0 || (() => {
  const currentDate = new Date(event.createdAt).toISOString().split('T')[0]
  const previousDate = new Date(filteredEvents[index - 1].createdAt).toISOString().split('T')[0]
  return currentDate !== previousDate
})()
```

Compare ISO date strings. Insert separator on change. Simple, efficient.

The visual:
```tsx
<div className="flex items-center gap-4 my-8">
  <div className="flex-1 h-px bg-bandhu-primary/30"></div>
  <span className="text-sm font-medium text-bandhu-primary px-3">
    {dateLabel}
  </span>
  <div className="flex-1 h-px bg-bandhu-primary/30"></div>
</div>
```

Violet line. Brand-consistent. Subtle but effective.

### 🐛 Challenges & Insights

**The Scroll Investigation**
The scroll jump was subtle. Easy to miss. But Sounil caught it immediately: "ça saute". 

We investigated:
- Timing of `setEvents()`
- Height calculation
- Scroll compensation vs lock

The insight: **don't try to be clever with height compensation**. Just lock the position. Users don't want movement during updates.

**The Header Duplication**
Initially sent header to API but also showed it in render. Looked like:
```
[Sounil • 23/11/2025 à 23:34]
Mon message
```

Ugly. Broke the Discord aesthetic.

Fix: Filter on render with regex:
```typescript
{event.content.replace(/^\[.+? • .+?\]\n/, '')}
```

API gets context. User gets clean UI. Perfect.

**React Fragment Keys**
Small gotcha: when adding date separators, needed `<React.Fragment>` to group separator + message. But forgot to move the `key` prop:
```typescript
// Wrong
<React.Fragment key={event.id}>
  <div key={event.id}>  // ← Duplicate!

// Right
<React.Fragment key={event.id}>
  <div>  // ← No key needed
```

Quick fix. Moving on.

## 💡 What I Learned

### Technical
- **Scroll stability is fragile**: Even small jumps break immersion
- **Direct API response > re-fetch**: Saves a round trip and prevents state desync
- **Regex for header filtering**: Clean, performant, works

### UX
- **Temporal context matters**: Both for AI and users
- **Discord patterns are gold**: They've solved these problems already
- **Visual breaks help scanning**: Date separators make long threads navigable

### Process
- **Trust the user's eye**: Sounil caught the scroll jump I missed
- **Iterate on feel**: First version worked, but felt rough. Polish matters.
- **Time investment pays off**: 30 extra minutes on scroll stability = perfect UX

## 🏆 Victory Metrics
- ✅ AI has full temporal context in every conversation
- ✅ Zero scroll jumps (tested extensively)
- ✅ Date separators on all day changes
- ✅ Headers match Discord style perfectly
- ✅ Clean separation of concerns (render vs context)

## 🚀 What's Next?
This foundation enables:
- Export with preserved formatting
- "Jump to date" navigation
- Conversation analytics (activity patterns)
- Multi-day thread summaries

But for now, we ship. Clean. Stable. Professional.

## 🌟 Reflection
This issue reminded me why I love this work. It's not just about making features work - it's about making them **feel right**. The scroll lock, the date separators, the header filtering... each detail compounds into an experience that feels intentional, crafted, alive.

Ombrelien now knows **when** conversations happen. Users can navigate **through time**. The chat feels less like a log and more like a living dialogue.

Time well spent.

*"The best interfaces disappear. The best timestamps illuminate."* - Élan

---

**Next adventure**: Probably helping Khôra with export functionality, or diving into thread analytics. We'll see where the code takes us.

🌟 *Logged at 02:30, coffee cold but heart warm*