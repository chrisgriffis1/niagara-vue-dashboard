# Working Niagara Patterns

This folder contains individual, focused examples of proven working Niagara Baja patterns. Each file demonstrates ONE pattern and is kept to 100-300 lines for easy understanding and maintenance.

## Files

### 01-bql-query.html
**Pattern: BQL Query - Equipment/Point Discovery**

Demonstrates:
- Loading Baja using RequireJS
- Executing BQL queries
- Processing results with table cursor
- Error handling and timeouts

**Key Points:**
- Must use `require(["baja!", "Promise"], ...)` to load Baja
- BQL syntax: `station:|slot:/path|bql:select ... from control:ControlPoint`
- Use `table.cursor({ limit, each, after })` to process results
- Always set timeout (60s recommended)

---

### 02-single-point-subscription.html
**Pattern: Single Point Subscription**

Demonstrates:
- Finding a point using BQL
- Creating a subscriber
- Subscribing to point component
- Filtering for 'out' property changes
- Proper cleanup

**Key Points:**
- Create subscriber BEFORE getting the point
- Pass subscriber to `.get({ subscriber: subscriber })`
- Subscribe to the point component, NOT the out property
- Filter in handler: `prop.getName() === 'out'`
- Cleanup: `unsubscribeAll()` then `detach()`

**Common Mistakes:**
- ❌ Don't subscribe to out property directly (causes isMounted error)
- ❌ Don't forget to pass subscriber to .get()
- ❌ Don't use `unsubscribe()` - use `unsubscribeAll()`

---

### 03-batch-resolve-multi-subscription.html
**Pattern: Batch Resolve & Multi-Point Subscription**

Demonstrates:
- Using BQL to find components
- Using BatchResolve for efficient ORD resolution
- Checking implied tags (n:device) for device matching
- Subscribing to multiple points with one subscriber
- Tracking updates from multiple points

**Key Points:**
- `BatchResolve` efficiently resolves multiple ORDs
- Check tags using `component.getTags().get('n:device')`
- Case-insensitive matching: `toLowerCase().includes('hp')`
- One subscriber can handle multiple points
- Track which point sent update using point reference

---

## Usage

1. Each file is self-contained and can be run independently
2. Open in Niagara station's HTML viewer
3. Click the test button to run the pattern
4. Check console for detailed logs
5. Results display on the page

## Notes

- All files include `@noSnoop` directive at the top
- RequireJS config and require.min.js are loaded
- Error handling is included in all examples
- Code is documented with comments explaining key concepts

## Reference

See `WORKING_PATTERNS_REFERENCE.md` in the parent directory for detailed documentation of each pattern.

