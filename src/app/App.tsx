import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureContentLoaded, openDbForUser, type UserProfile } from '../db/db';
import { useAuth } from '../auth/AuthContext';
import { TabBar } from '../components/TabBar';
import Login from '../screens/Login';
import ChangePassword from '../screens/ChangePassword';
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
import Users from '../screens/Users';
import { GuideIndex, GuideSource } from '../screens/Guide';

export default function App() {
  const { user } = useAuth();
  if (user === undefined) return <div className="page center"><p className="muted">Loading…</p></div>;
  if (!user) return <Login />;
  if (user.mustChangePassword) return <ChangePassword forced />;
  return <SignedInApp key={user.id} accountId={user.id} />;
}

function SignedInApp({ accountId }: { accountId: string }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    setReady(false);
    openDbForUser(accountId);
    ensureContentLoaded().then(() => setReady(true)).catch(e => setError(String(e)));
  }, [accountId]);

  // undefined = still loading, null = no local profile yet (needs onboarding)
  const profile = useLiveQuery(async (): Promise<UserProfile | null | undefined> => {
    if (!ready) return undefined;
    return (await db.userProfile.toCollection().first()) ?? null;
  }, [ready]);

  if (error) return <div className="page"><p className="error">Could not open local storage: {error}</p></div>;
  if (!ready || profile === undefined) return <div className="page center"><p className="muted">Loading…</p></div>;

  if (profile === null) {
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
          <Route path="/settings/password" element={<ChangePassword />} />
          <Route path="/settings/users" element={<Users />} />
          <Route path="/settings/documents" element={<StudyDocuments />} />
          <Route path="/guide" element={<GuideIndex />} />
          <Route path="/guide/:sourceId" element={<GuideSource />} />
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
