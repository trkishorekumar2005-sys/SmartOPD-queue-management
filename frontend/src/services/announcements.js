export function buildAnnouncement(tokenNumber, departmentName) {
  return `Token ${tokenNumber}, please proceed to ${departmentName}.`
}

// Compares the latest queues with the token last seen per department and returns the
// tokens that are newly being served. The first snapshot (previous === null) is only a
// baseline, so opening or refreshing the display never re-announces the current token.
export function findNewAnnouncements(previous, latestQueues) {
  const next = {}
  const announcements = []

  for (const { department, queue } of latestQueues) {
    const tokenNumber = queue.serving?.token_number ?? null
    next[department.id] = tokenNumber

    if (previous !== null && tokenNumber && tokenNumber !== previous[department.id]) {
      announcements.push(buildAnnouncement(tokenNumber, department.name))
    }
  }

  return { announcements, next }
}

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function speak(text) {
  if (!isSpeechSupported()) return
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
