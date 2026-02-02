
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { supabase } from '../auth/supabaseClient.ts';
import { Car } from 'lucide-react';

const LandingTerminal: React.FC = () => {
  const { setTransientVehicle, setCurrentView, setLoading, guestAttempts, incrementGuestAttempts, session, reset } = useAutoPalStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const