import React, { useState, useRef, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import CasinoBackground from '@/components/ui/CasinoBackground';

const NOTIFICATION_TYPE_STRINGS: string[] = [
  'friends',
  'games',
  'system',
]

const NOTIFICATION_TYPE_DESCRIPTIONS: string[] = [
  'Friend requests and acceptances.',
  'Game invites, your turn reminders, and match results.',
  'Deposit, Withdraw and Account Updates.',
]

const NOTIFICATION_TYPE_ICONS: React.ReactNode[] = [
  (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16.5" cy="9.5" r="2.25" />
      <path strokeLinecap="round" d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path strokeLinecap="round" d="M14.75 14.75c2.25.25 3.75 2 3.75 4.25" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8a6 6 0 1112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
      <path strokeLinecap="round" d="M10 20a2 2 0 004 0" />
    </svg>
  ),
]

const NotificationTypeToggle: React.FC<{
  title:       string,
  description: string,
  icon:        React.ReactNode,
  checked:     boolean,
  setter:      (value: boolean) => void,
}> = ({
  title, description, icon, checked, setter
}) => {
  return (
    <label className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 cursor-pointer">
      <span className={
        'flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] '
        + (checked
          ? 'bg-[rgba(212,175,55,0.12)] border-[rgba(212,175,55,0.35)] text-[var(--gold)]'
          : 'bg-[var(--surface-2)] border-[rgba(212,175,55,0.1)] text-[var(--text-3)]')
      }>
        {icon}
      </span>
      <span className="min-w-0 flex-1 select-none">
        <span className="block text-sm font-semibold text-[var(--text)] capitalize">{title}</span>
        <span className="block text-xs text-[var(--text-3)] mt-0.5 leading-snug">{description}</span>
      </span>
      <input
        type="checkbox"
        value=""
        className="sr-only peer"
        checked={checked}
        onChange={(e) => {setter(e.target.checked)}}
      />
      <div className="
        relative
        shrink-0
        w-11
        h-6
        rounded-full
        bg-[var(--surface-2)]
        border
        border-[rgba(212,175,55,0.15)]
        transition-colors
        duration-200
        ease-[cubic-bezier(0.23,1,0.32,1)]
        peer-checked:bg-[var(--gold)]
        peer-checked:border-[var(--gold)]
        peer-focus-visible:ring-2
        peer-focus-visible:ring-[rgba(212,175,55,0.35)]
        active:scale-95
        after:content-['']
        after:absolute after:top-[2px]
        after:start-[2px]
        after:bg-white
        after:shadow-[0_1px_2px_rgba(0,0,0,0.35)]
        after:rounded-full
        after:h-[1.125rem]
        after:w-[1.125rem]
        after:transition-transform
        after:duration-200
        after:ease-[cubic-bezier(0.23,1,0.32,1)]
        peer-checked:after:translate-x-5
      "></div>
    </label>
  );
}

const ProfilePage: React.FC = () => {
  const { user, notificationTypes, error, updateProfile, uploadAvatar, profile_setNotificationTypes } = useProfile();
  const { refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identitySuccess, setIdentitySuccess] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [haveNotificationTypes, setHaveNotificationTypes] = useState<boolean[]>(
    new Array(NOTIFICATION_TYPE_STRINGS.length).fill(true)
  );
  const [savedHaveNotificationTypes, setSavedHaveNotificationTypes] = useState<boolean[]>(
    new Array(NOTIFICATION_TYPE_STRINGS.length).fill(true)
  );
  const notificationSettingsChanged = haveNotificationTypes.some(
    (haveNotificationType, index) => haveNotificationType !== savedHaveNotificationTypes[index]
  );
  const setHaveNotificationTypesIndex = (index: number) => {
    return (value: boolean) => {
      var nextHaveNotificationTypes: boolean[] = structuredClone(haveNotificationTypes);
      console.log("Before:", nextHaveNotificationTypes);
      nextHaveNotificationTypes[index] = value;
      console.log("After:", nextHaveNotificationTypes);
      setHaveNotificationTypes(nextHaveNotificationTypes);
    };
  };

  const [notificationSettingsSuccess,  setNotificationSettingsSuccess]  = useState(false);
  const [notificationSettingsError,    setNotificationSettingsError]    = useState<string | null>(null);
  const [notificationSettingsApplying, setNotificationSettingsApplying] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
    if (notificationTypes) {
      var nextHaveNotificationTypes: boolean[] = Array(NOTIFICATION_TYPE_STRINGS.length).fill(false);
      notificationTypes.forEach((notificationType) => {
        var index: number = NOTIFICATION_TYPE_STRINGS.indexOf(notificationType);
        if(index == -1) {
          console.error("Invalid notification type: " + notificationType);
        } else {
          nextHaveNotificationTypes[index] = true;
        }
      })
      setHaveNotificationTypes(nextHaveNotificationTypes);
      setSavedHaveNotificationTypes(nextHaveNotificationTypes);
    }
  }, [user?.id, notificationTypes]);

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentitySuccess(false);
    setIdentityError(null);
    setIdentityLoading(true);
    try {
      await updateProfile(username, email);
      await refreshUser();
      setIdentitySuccess(true);
      setTimeout(() => setIdentitySuccess(false), 3000);
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIdentityLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(false);
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await updateProfile(user?.username ?? '', user?.email ?? '', newPassword);
      await refreshUser();
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationSettingsSuccess(false);
    setNotificationSettingsError(null);
    setNotificationSettingsApplying(true);
    try {
      var notificationTypesToSend: string[] = [];
      haveNotificationTypes.forEach((haveNotificationType, notificationTypeIndex) => {
        if(haveNotificationType) {
          notificationTypesToSend.push(NOTIFICATION_TYPE_STRINGS[notificationTypeIndex])
        }
      })
      await profile_setNotificationTypes(notificationTypesToSend);
      setSavedHaveNotificationTypes(haveNotificationTypes);
      setNotificationSettingsSuccess(true);
      setTimeout(() => setNotificationSettingsSuccess(false), 3000);
    } catch(err) {
      console.log(err instanceof Error ? err.message : 'Apply failed');
      setNotificationSettingsError(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setNotificationSettingsApplying(false);
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.15)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[rgba(212,175,55,0.4)] focus:ring-2 focus:ring-[rgba(212,175,55,0.1)] input-focus-transition';
  const labelClass = 'block text-xs uppercase tracking-widest font-semibold text-[var(--text-3)] mb-2';
  const saveButtonClass =
    'px-6 py-2.5 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] text-[var(--gold)] font-semibold text-sm uppercase tracking-wider hover:bg-[rgba(212,175,55,0.18)] hover:border-[rgba(212,175,55,0.5)] active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <main className="overflow-x-hidden w-full max-w-full">
      <div className="min-h-screen bg-[var(--base)] text-[var(--text)] pt-24 pb-16 px-6">
        <CasinoBackground />
        <div className="relative z-10 max-w-5xl mx-auto fade-in-up">
          <div className="mb-8">
            <p className="eyebrow mb-2">Settings</p>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
              Your <span className="text-[var(--gold)] italic">Profile</span>
            </h1>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8">
            <div className="flex flex-col items-center gap-3">
              <Avatar
                avatarURL={user?.avatarURL}
                size={96}
                onClick={() => fileInputRef.current?.click()}
                isUploading={avatarUploading}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <p className="text-xs text-[var(--text-3)] text-center">Click to change</p>
              {avatarError && <p className="text-xs text-red-400 text-center max-w-[120px]">{avatarError}</p>}
              {user && (
                <div className="text-center mt-1">
                  <p className="font-serif text-lg font-semibold text-[var(--text)]">{user.username}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">
                    Joined {new Date(user.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[var(--surface)] p-6">
                <h2 className="font-serif text-xl font-semibold text-[var(--text)] mb-5">Identity</h2>
                <form onSubmit={handleIdentitySubmit} className="space-y-4">
                  <div>
                    <label htmlFor="username" className={labelClass}>Username</label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={labelClass}>Email</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className={inputClass}
                    />
                  </div>
                  {identityError && <p className="text-sm text-red-400">{identityError}</p>}
                  {identitySuccess && <p className="text-sm text-emerald-400">Changes saved</p>}
                  <div className="flex justify-end">
                    <button type="submit" disabled={identityLoading} className={saveButtonClass}>
                      {identityLoading ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[var(--surface)] p-6">
                <h2 className="font-serif text-xl font-semibold text-[var(--text)] mb-5">Change Password</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className={labelClass}>New password</label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className={labelClass}>Confirm password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className={inputClass}
                    />
                  </div>
                  {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
                  {passwordSuccess && <p className="text-sm text-emerald-400">Password updated</p>}
                  <div className="flex justify-end">
                    <button type="submit" disabled={passwordLoading || !newPassword} className={saveButtonClass}>
                      {passwordLoading ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[var(--surface)] p-6">
                <h2 className="font-serif text-xl font-semibold text-[var(--text)]">Notification Settings</h2>
                <p className="text-sm text-[var(--text-3)] mt-1 mb-2">Choose what you want to hear about.</p>
                <form onSubmit={handleApplyNotificationSettings}>
                  <div className="divide-y divide-[rgba(212,175,55,0.08)]">
                    <NotificationTypeToggle
                      title={NOTIFICATION_TYPE_STRINGS[0]}
                      description={NOTIFICATION_TYPE_DESCRIPTIONS[0]}
                      icon={NOTIFICATION_TYPE_ICONS[0]}
                      checked={haveNotificationTypes[0]}
                      setter={setHaveNotificationTypesIndex(0)}
                    />
                    <NotificationTypeToggle
                      title={NOTIFICATION_TYPE_STRINGS[1]}
                      description={NOTIFICATION_TYPE_DESCRIPTIONS[1]}
                      icon={NOTIFICATION_TYPE_ICONS[1]}
                      checked={haveNotificationTypes[1]}
                      setter={setHaveNotificationTypesIndex(1)}
                    />
                    <NotificationTypeToggle
                      title={NOTIFICATION_TYPE_STRINGS[2]}
                      description={NOTIFICATION_TYPE_DESCRIPTIONS[2]}
                      icon={NOTIFICATION_TYPE_ICONS[2]}
                      checked={haveNotificationTypes[2]}
                      setter={setHaveNotificationTypesIndex(2)}
                    />
                  </div>
                  {notificationSettingsError && <p className="text-sm text-red-400 mt-4">{notificationSettingsError}</p>}
                  {notificationSettingsSuccess && <p className="text-sm text-emerald-400 mt-4">Settings Applied</p>}
                  <div className="flex justify-end mt-5">
                    <button type="submit" disabled={notificationSettingsApplying || !notificationSettingsChanged} className={saveButtonClass}>
                      {notificationSettingsApplying ? 'Applying…' : 'Apply settings'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProfilePage;
