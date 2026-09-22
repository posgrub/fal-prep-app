import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureContentLoaded, type UserProfile } from '../db/db';
import { TabBar } from '../components/TabBar';
import Onboarding from '../screens/Onboarding';
import Today from '../screens/Today';
import Review from '../screens/Review';
import TestRunner from '../screens/TestRunner';
import Results from '../screens/Results';
import Practice from '../screens/Practice';
import Progress from '../screens/Progress';
import Settings from '../screens/Settings';
import StudyDocuments from '../screens/StudyDocuments';
import HarrisCounty from '../screens/HarrisCounty';
import About from '../screens/About';

export interface AppCtx { profile: UserProfile }

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = useLiveQuery(() => db.userProfile.toCollection().first(), [], null);
  const location = useLocation();

  useEffect(() => {
    ensureContentLoaded().then(() => setReady(true)).catch(e => setError(String(e)));
  }, []);

  if (error) return <div className="page"><p className="error">Could not open local storage: {error}</p></div>;
  if (!ready || profile === null) return <div className="page center"><p className="muted">Loading…</p></div>;

  if (!profile) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  const fullScreen = /^\/(test|review)\//.test(location.pathname);
  return (
    <div className={'app' + (fullScreen ? ' app--full' : '')}>
      <main className="main">
        <Routes>
          <Route path="/" element={<Today profile={profile} />} />
          <Route path="/review/:day" element={<Review profile={profile} />} />
          <Route path="/test/:attemptId" element={<TestRunner profile={profile} />} />
          <Route path="/results/:attemptId" element={<Results />} />
          <Route path="/practice" element={<Practice profile={profile} />} />
          <Route path="/progress" element={<Progress profile={profile} />} />
          <Route path="/settings" element={<Settings profile={profile} />} />
          <Route path="/settings/documents" element={<StudyDocuments />} />
          <Route path="/settings/harris-county" element={<HarrisCounty />} />
          <Route path="/settings/about" element={<About />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!fullScreen && <TabBar />}
    </div>
  );
}
