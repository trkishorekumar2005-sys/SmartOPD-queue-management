import { useEffect, useRef, useState } from 'react'
import { getDepartments, getQueue } from '../services/api'
import { findNewAnnouncements, isSpeechSupported, speak, stopSpeaking } from '../services/announcements'
import { usePolling } from '../hooks/usePolling'
import './DisplayScreen.css'

const nextTokensShown = 3

function statusMessage(department, queue) {
  if (queue.serving) return `Please proceed to ${department.name}`
  if (queue.waiting.length > 0) return 'Next patient will be called shortly'
  return 'No patients waiting'
}

function DisplayScreen() {
  const [queues, setQueues] = useState(null)
  const [hasConnectionError, setHasConnectionError] = useState(false)
  const [isVoiceOn, setIsVoiceOn] = useState(false)
  const lastServingTokens = useRef(null)

  usePolling(async (isActive) => {
    try {
      const departments = await getDepartments()
      const latestQueues = await Promise.all(
        departments.map(async (department) => ({ department, queue: await getQueue(department.id) })),
      )

      if (!isActive()) return

      // The baseline is updated even while voice is off, so turning it on never replays old tokens.
      const { announcements, next } = findNewAnnouncements(lastServingTokens.current, latestQueues)
      lastServingTokens.current = next
      if (isVoiceOn) announcements.forEach(speak)

      setQueues(latestQueues)
      setHasConnectionError(false)
    } catch {
      if (isActive()) setHasConnectionError(true)
    }
  }, 'display')

  useEffect(() => stopSpeaking, [])

  function toggleVoice() {
    if (isVoiceOn) {
      stopSpeaking()
    } else {
      // Browsers only allow speech after a user click, so this click also unlocks it.
      speak('Voice announcements are on.')
    }
    setIsVoiceOn(!isVoiceOn)
  }

  return (
    <main className="display-screen">
      <header>
        <h1>VOUGHT+ HOSPITAL</h1>
        <p>OPD Queue Display</p>
        {isSpeechSupported() && (
          <button className="voice-button" type="button" onClick={toggleVoice}>
            {isVoiceOn ? 'Voice announcements: ON' : 'Enable voice announcements'}
          </button>
        )}
      </header>

      {hasConnectionError && <p className="display-warning">Connection problem. Retrying...</p>}

      <section className="display-grid">
        {!queues && !hasConnectionError && <p>Loading queue information...</p>}
        {queues?.map(({ department, queue }) => (
          <article className="display-department" key={department.id}>
            <h2>{department.name.toUpperCase()}</h2>
            <p>NOW SERVING</p>
            <strong>{queue.serving?.token_number || '--'}</strong>
            <p>NEXT</p>
            <b>{queue.waiting.slice(0, nextTokensShown).map((token) => token.token_number).join('  ') || '--'}</b>
            <p className="display-message">{statusMessage(department, queue)}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default DisplayScreen
