import { router } from "expo-router";

// Page history is tracked independently of nested tab stacks, which can retain
// their own index routes even after the user has visited another tab.
const visited: string[] = [];
let returningTo: string | null = null;

export function recordVisitedPage(path: string) {
  if (!path || path === "/welcome" || path === "/start") return;
  if (returningTo === path) {
    returningTo = null;
    return;
  }
  returningTo = null;
  if (visited[visited.length - 1] !== path) {
    visited.push(path);
    if (visited.length > 50) visited.shift();
  }
}

export function goBackToVisitedPage(fallback: string = "/") {
  const current = visited.pop();
  const previous = visited[visited.length - 1];
  if (previous && previous !== current) {
    returningTo = previous;
    router.navigate(previous as Parameters<typeof router.navigate>[0]);
    return;
  }
  if (current) visited.push(current);
  if (router.canGoBack()) router.back();
  else router.navigate(fallback as Parameters<typeof router.navigate>[0]);
}
