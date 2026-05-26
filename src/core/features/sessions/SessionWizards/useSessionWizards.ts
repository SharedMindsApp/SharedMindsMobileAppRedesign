// useSessionWizards
//
// Manages the realtime broadcast channel for host-triggered wizards and
// exposes a simple state machine: { activeWizardId, launchWizard, endWizard }.
//
// Host: launchWizard() sends a 'start' broadcast and sets local state.
// Participant: subscribes; 'start' broadcasts update local state, 'end'
// clears it. Participants can also dismiss locally without ending for
// everyone (endLocally).

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { WizardId, WizardSyncEvent } from './types';
import { findWizard } from './registry';

interface Options {
  sessionId: string | null;
  isGroupSession: boolean;
  isHost: boolean;
}

interface SessionWizardsApi {
  /** Currently-running wizard id (null = no wizard active locally). */
  activeWizardId: WizardId | null;
  /** Host action: launch + broadcast. No-op for non-hosts. */
  launchWizard: (id: WizardId) => void;
  /** Host action: broadcast end to all participants. */
  broadcastEnd: () => void;
  /** Local-only dismiss — clears my own overlay. Participants use this
   *  to skip a wizard the host triggered without disrupting others. */
  dismissLocally: () => void;
}

export function useSessionWizards({
  sessionId,
  isGroupSession,
  isHost,
}: Options): SessionWizardsApi {
  const [activeWizardId, setActiveWizardId] = useState<WizardId | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isGroupSession || !sessionId) {
      channelRef.current = null;
      return;
    }
    const channel = supabase.channel(`wizard:${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'wizard' }, (msg) => {
      const event = msg.payload as WizardSyncEvent;
      if (event.type === 'start') {
        setActiveWizardId(event.wizardId);
      } else if (event.type === 'end') {
        setActiveWizardId(null);
      }
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isGroupSession, sessionId]);

  function broadcast(event: WizardSyncEvent) {
    const ch = channelRef.current;
    if (!ch) return;
    ch.send({ type: 'broadcast', event: 'wizard', payload: event });
  }

  function launchWizard(id: WizardId) {
    const entry = findWizard(id);
    // Personal wizards (broadcast: false) can be triggered by anyone for
    // themselves — solo users, participants in group sessions, anyone.
    // Shared wizards are host-only.
    const isPersonal = entry?.broadcast === false;
    if (!isPersonal && !isHost) return;
    setActiveWizardId(id);
    if (!isPersonal) {
      broadcast({ type: 'start', wizardId: id, startedAt: Date.now() });
    }
  }

  function broadcastEnd() {
    if (!isHost) return;
    setActiveWizardId(null);
    broadcast({ type: 'end' });
  }

  function dismissLocally() {
    setActiveWizardId(null);
  }

  return { activeWizardId, launchWizard, broadcastEnd, dismissLocally };
}
