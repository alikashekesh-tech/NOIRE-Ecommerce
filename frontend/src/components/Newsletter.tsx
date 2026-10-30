import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../services/api'
import { cx } from '../lib/format'
import { Spinner } from './ui'

export function Newsletter({ tone = 'light', source }: { tone?: 'light' | 'dark'; source: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState('busy')
    setError(null)
    try {
      await api('/newsletter', { method: 'POST', body: { email, source } })
      setState('done')
    } catch (err) {
      setError(err instanceof ApiError ? (err.field('email') ?? err.message) : 'Please try again.')
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <p role="status" className={cx('text-[14px]', tone === 'dark' ? 'text-ivory/80' : 'text-muted')}>
        Thank you — you’re on the list. (Demo: your opt-in is stored locally; no emails are sent.)
      </p>
    )
  }

  const dark = tone === 'dark'
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={`nl-${source}`} className="sr-only">
        Email address
      </label>
      <div className={cx('flex items-center rounded-full border p-1', dark ? 'border-ivory/30' : 'border-ink/20 bg-surface')}>
        <input
          id={`nl-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-invalid={!!error}
          aria-describedby={error ? `nl-${source}-err` : undefined}
          className={cx('h-11 min-w-0 flex-1 bg-transparent px-4 text-[14px] outline-none', dark ? 'text-ivory placeholder:text-ivory/45' : 'placeholder:text-muted')}
        />
        <button className={cx('btn btn-sm h-11', dark ? 'btn-light' : 'btn-primary')} disabled={state === 'busy'}>
          {state === 'busy' ? <Spinner /> : 'Subscribe'}
        </button>
      </div>
      {error && (
        <p id={`nl-${source}-err`} className={cx('mt-2 text-[13px]', dark ? 'text-ivory' : 'text-danger')}>
          {error}
        </p>
      )}
      <p className={cx('mt-3 text-[12px]', dark ? 'text-ivory/45' : 'text-muted')}>By subscribing you agree to receive NOIRÉ news. Unsubscribe anytime.</p>
    </form>
  )
}
