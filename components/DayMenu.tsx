'use client'
import { Icon } from './Icon'
import { useState } from 'react'

type Props = {
  dateLabel: string
  connected: boolean
  question: string
  onEdit: () => void
  onAdd: () => void
  onDownload: () => void
  onDelete: () => Promise<void>
  onClose: () => void
}

/** The ••• menu on a day: a bottom sheet on phones, a dropdown card on computers. */
export function DayMenu({ dateLabel, connected, question, onEdit, onAdd, onDownload, onDelete, onClose }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const item = 'block w-full border-b border-line px-1 py-3 text-left'

  async function copy() {
    try { await navigator.clipboard.writeText(question); setCopied(true) } catch { setCopied(false) }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/50 lg:items-start lg:justify-end lg:bg-transparent lg:p-6" onClick={onClose}>
      <div className="safe-bottom w-full rounded-t-2xl border-t border-line bg-surface px-4 pt-3 lg:mt-10 lg:w-72 lg:rounded-card lg:border lg:pb-2" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded bg-line lg:hidden" />
        {confirming ? (
          <div className="py-3">
            <p className="mb-3">Delete {dateLabel}? This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={async () => { setBusy(true); await onDelete(); setBusy(false) }}
                className="flex-1 rounded-card bg-[#e89f88] py-2.5 font-bold text-on-accent disabled:opacity-60"
              >
                Delete
              </button>
              <button onClick={() => setConfirming(false)} className="flex-1 rounded-card border border-line py-2.5">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <button className={item} onClick={onEdit}><span className="flex items-center gap-2.5"><Icon name="edit" size={17} />Edit this day</span></button>
            <button className={item} onClick={onAdd}><span className="flex items-center gap-2.5"><Icon name="plus" size={17} />Add something to this day</span></button>
            <button className={item} onClick={onEdit}><span className="flex items-center gap-2.5"><Icon name="refresh" size={17} />Change the score</span></button>
            {connected && <button className={item} onClick={copy}><span className="flex items-center gap-2.5"><Icon name="chat" size={17} />{copied ? 'Copied. Paste it into your AI' : 'Copy a question for your AI'}</span></button>}
            <button className={item} onClick={onDownload}><span className="flex items-center gap-2.5"><Icon name="download" size={17} />Download this day</span></button>
            <button className={`${item} border-b-0 text-[#e89f88]`} onClick={() => setConfirming(true)}><span className="flex items-center gap-2.5"><Icon name="trash" size={17} />Delete this day</span></button>
          </>
        )}
      </div>
    </div>
  )
}
