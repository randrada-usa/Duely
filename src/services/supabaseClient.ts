import 'react-native-url-polyfill/auto';

import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import { supabaseConfigState } from '../config/supabase';
import { supabaseSessionStorage } from './supabaseStorage';

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (supabaseConfigState.status === 'unconfigured') return null;
  if (supabaseConfigState.status === 'invalid') {
    throw new Error(supabaseConfigState.reason);
  }
  if (client) return client;

  client = createClient(
    supabaseConfigState.config.url,
    supabaseConfigState.config.publishableKey,
    {
      auth: {
        storage: supabaseSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    },
  );
  return client;
}

export function startSupabaseSessionRefresh(supabase: SupabaseClient) {
  const updateRefreshState = (state: AppStateStatus) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };

  updateRefreshState(AppState.currentState);
  const subscription = AppState.addEventListener('change', updateRefreshState);

  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}
