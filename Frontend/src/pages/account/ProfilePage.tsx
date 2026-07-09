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

const NotificationTypeToggle: React.FC<{
  title:          string,
  defaultChecked: boolean,
  setter:         (value: boolean) => void,
}> = ({
  title, defaultChecked, setter
}) => {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        value=""
        className="sr-only peer"
        defaultChecked={defaultChecked}
        onChange={(e) => {setter(e.target.checked)}}
      />
      <div className="
        relative
        w-12
        h-7
        border
        border-[rgba(212,175,55,0.12)]
        dark:peer-focus:ring-brand-soft
        rounded-full
        peer
        peer-checked:after:translate-x-[1.25rem]
        peer-checked:bg-[rgba(212,175,55,0.2)]
        rtl:peer-checked:after:-translate-x-[1.25rem]
        after:content-['']
        after:absolute after:top-[5px]
        after:start-[4px]
        after:bg-[var(--gold)]
        after:rounded-full
        after:h-[1rem]
        after:w-[1rem]
        after:transition-all
      "></div>
      <span className="select-none ms-3">{title}</span>
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
    new Array(NOTIFICATION_TYPE_STRINGS.length).fill(false)
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
                <h2 className="font-serif text-xl font-semibold text-[var(--text)] mb-5">Notification Settings</h2>
                <form onSubmit={handleApplyNotificationSettings} className="space-y-4">
                  <div>
                    <NotificationTypeToggle
                      title={NOTIFICATION_TYPE_STRINGS[0]}
                      defaultChecked={haveNotificationTypes[0]}
                      setter={setHaveNotificationTypesIndex(0)}
                    />
                  </div>
                  <div>
                    <NotificationTypeToggle
                      title={NOTIFICATION_TYPE_STRINGS[1]}
                      defaultChecked={haveNotificationTypes[1]}
                      setter={setHaveNotificationTypesIndex(1)}
                    />
                  </div>
                  <div>
                    <NotificationTypeToggle
                      title={NOTIFICATION_TYPE_STRINGS[2]}
                      defaultChecked={haveNotificationTypes[2]}
                      setter={setHaveNotificationTypesIndex(2)}
                    />
                  </div>
                  {notificationSettingsError && <p className="text-sm text-red-400">{notificationSettingsError}</p>}
                  {notificationSettingsSuccess && <p className="text-sm text-emerald-400">Settings Applied</p>}
                  <div className="flex justify-end">
                    <button type="submit" disabled={notificationSettingsApplying} className={saveButtonClass}>
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
