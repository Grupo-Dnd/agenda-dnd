import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ohpmbslsnxzepcasmdte.supabase.co'
const SUPABASE_KEY = 'sb_publishable_n1X4mkIt9bPwYegZR8Ox-Q_9HqnBlDh'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)