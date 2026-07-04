import React, { useState, useEffect } from 'react';
import { Cloud, Loader2, Save, Trash2, AlertCircle, Laptop, LogIn, LogOut, CheckCircle2, AlertTriangle, FolderOpen } from 'lucide-react';
import { ICloudProvider, CloudProjectMetadata, ProjectData, CloudUser } from '../types';

interface CloudModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: ICloudProvider;
    activeProviderType: string;
    onProviderChange: (type: string) => void;
    currentProject: ProjectData | null;
    onLoadProject: (project: ProjectData) => void;
    onSaveCurrent: () => Promise<void>; // Triggers the save logic in parent
}

const CloudModal: React.FC<CloudModalProps> = ({
    isOpen,
    onClose,
    provider,
    activeProviderType,
    onProviderChange,
    currentProject,
    onLoadProject,
    onSaveCurrent
}) => {
    const [projects, setProjects] = useState<CloudProjectMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'list' | 'save'>('list');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<CloudUser | null>(null);

    // Check auth and load list if authenticated
    useEffect(() => {
        if (isOpen) {
            const auth = provider.isAuthenticated();
            setIsAuthenticated(auth);
            setCurrentUser(provider.getUser());

            if (auth) {
                loadList();
                setMode('list');
            } else {
                setProjects([]);
            }
            setError(null);
        }
    }, [isOpen, provider]);

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await provider.login();
            setIsAuthenticated(true);
            setCurrentUser(provider.getUser());
            await loadList();
        } catch (e: any) {
            setError(e.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await provider.logout();
            setIsAuthenticated(false);
            setCurrentUser(null);
            setProjects([]);
        } catch (e: any) {
            setError(e.message || "Logout failed");
        } finally {
            setIsLoading(false);
        }
    };

    const loadList = async () => {
        setIsLoading(true);
        setProjects([]);
        try {
            const list = await provider.listProjects();
            setProjects(list);
        } catch (e: any) {
            setError(e.message || "Failed to list projects");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await onSaveCurrent();
            await loadList(); // Refresh list
            setMode('list');
        } catch (e: any) {
            setError(e.message || "Save failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoad = async (id: string) => {
        setIsLoading(true);
        try {
            const proj = await provider.loadProject(id);
            onLoadProject(proj);
            onClose();
        } catch (e: any) {
            setError(e.message || "Load failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this project from the cloud?")) return;

        setIsLoading(true);
        try {
            await provider.deleteProject(id);
            await loadList();
        } catch (e: any) {
            setError(e.message || "Delete failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helpers for size formatting
    const formatSize = (bytes?: number) => {
        if (!bytes) return '--';
        const mb = bytes / (1024 * 1024);
        return mb.toFixed(2) + ' MB';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
    };

    const providers = [
        { id: 'browser', name: 'Browser', icon: Laptop, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
        { id: 'onedrive', name: 'OneDrive', icon: Cloud, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40' },
    ];

    const getCurrentProviderStyles = () => {
        switch (activeProviderType) {
            case 'onedrive': return { btn: 'bg-blue-600 hover:bg-blue-700', text: 'text-blue-600' };
            default: return { btn: 'bg-primary hover:bg-primary/90', text: 'text-primary' };
        }
    };

    const style = getCurrentProviderStyles();

    // Special check for Builder environment
    const redirectUri = provider.getRedirectUri ? provider.getRedirectUri() : '';
    const isLocalhost = redirectUri.includes('localhost') || redirectUri.includes('127.0.0.1');
    const showBuilderWarning = activeProviderType === 'onedrive' && !isLocalhost;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface-container w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex overflow-hidden border border-outline-variant">

                {/* Sidebar */}
                <div className="w-64 bg-surface-container-high border-r border-outline-variant flex flex-col">
                    <div className="p-6 border-b border-outline-variant font-bold text-on-surface text-xl flex items-center gap-3">
                        <Cloud className="w-5 h-5" />
                        <span>Storage</span>
                    </div>
                    <div className="p-2 space-y-1 overflow-y-auto flex-1">
                        {providers.map(p => {
                            const isActive = activeProviderType === p.id;
                            const Icon = p.icon;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => onProviderChange(p.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-full text-sm font-medium transition-all mx-2 mb-1 w-[calc(100%-16px)] ${isActive
                                        ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                                        : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-md ${p.bg}`}>
                                        <Icon className={`w-4 h-4 ${p.color}`} />
                                    </div>
                                    {p.name}
                                </button>
                            )
                        })}
                    </div>
                    <div className="p-4 border-t border-outline-variant">
                        <button onClick={onClose} className="w-full py-2.5 bg-transparent border border-outline-variant rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors">
                            Close
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-surface-container">
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-outline-variant flex items-center justify-between bg-surface-container">
                        <div>
                            <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
                                {provider.name}
                            </h2>
                            <div className="text-xs text-on-surface-variant mt-1">
                                {isAuthenticated && currentUser ? (
                                    <div className="flex items-center gap-2">
                                        {currentUser.avatarUrl ? (
                                            <img src={currentUser.avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover border border-outline-variant" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        )}
                                        <span>Logged in as <span className="font-medium text-on-surface">{currentUser.name || currentUser.email}</span></span>
                                    </div>
                                ) : (
                                    <span>{activeProviderType === 'browser' ? 'Local Browser Storage' : 'Not Connected'}</span>
                                )}
                            </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {isAuthenticated && currentProject && (
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 rounded-full text-sm shadow-sm disabled:opacity-50 transition-all"
                                >
                                    {isLoading && mode === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Current
                                </button>
                            )}
                            {isAuthenticated && activeProviderType !== 'browser' && (
                                <button
                                    onClick={handleLogout}
                                    disabled={isLoading}
                                    className="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-md"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden flex flex-col p-6 bg-surface-container/50">

                        {error && (
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {showBuilderWarning && !isAuthenticated && (
                            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm border border-amber-200 dark:border-amber-900/30">
                                <h4 className="font-bold flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Preview Environment Detected
                                </h4>
                                <p className="mb-2">
                                    You are running this app in the AI Studio Builder Preview.
                                    OneDrive authentication requires the redirect URI to match exactly what is registered in Azure (e.g., <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">http://localhost:5173</code>).
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                                    Current detected Redirect URI: <br />
                                    <code className="bg-white dark:bg-slate-900 px-2 py-1 rounded border border-amber-200 dark:border-amber-800 mt-1 block break-all font-mono">{redirectUri}</code>
                                </p>
                                <p className="font-semibold">
                                    To use OneDrive, please download the code and run it locally. Use "Browser Storage" for testing here.
                                </p>
                            </div>
                        )}

                        {!isAuthenticated ? (
                            // Login Screen
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className={`p-6 rounded-full bg-surface-container-high shadow-md mb-6`}>
                                    {activeProviderType === 'onedrive' && <Cloud className="w-16 h-16 text-blue-600" />}
                                    {activeProviderType === 'browser' && <Laptop className="w-16 h-16 text-primary" />}
                                </div>
                                <h3 className="text-xl font-bold text-on-surface mb-2">Connect to {provider.name}</h3>
                                <p className="text-on-surface-variant max-w-sm mb-8">
                                    Sign in to access your projects stored on {provider.name}.
                                </p>
                                <button
                                    onClick={handleLogin}
                                    disabled={isLoading}
                                    className={`px-8 py-3 rounded-lg text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${style.btn}`}
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                                    Connect Account
                                </button>
                            </div>
                        ) : (
                            // List View
                            <>
                                <h3 className="font-semibold text-on-surface mb-3 flex items-center justify-between">
                                    <span>Saved Projects</span>
                                    <button
                                        onClick={loadList}
                                        disabled={isLoading}
                                        className="text-xs font-normal text-primary hover:underline disabled:opacity-50"
                                    >
                                        Refresh List
                                    </button>
                                </h3>

                                <div className="flex-1 overflow-y-auto bg-surface rounded-lg border border-outline-variant shadow-sm">
                                    {isLoading && mode === 'list' ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    ) : projects.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
                                            <div className="p-4 bg-surface-container-highest rounded-full mb-3">
                                                <Laptop className="w-8 h-8 opacity-50" />
                                            </div>
                                            <p>No projects found in this storage.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-outline-variant/30">
                                            {projects.map(proj => (
                                                <div key={proj.id} className="p-4 hover:bg-surface-container-highest/50 transition-colors flex items-center justify-between group">
                                                    <div className="min-w-0 flex-1 pr-4">
                                                        <h4 className="font-medium text-on-surface truncate">{proj.name}</h4>
                                                        <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1">
                                                            <span>{formatDate(proj.updatedAt)}</span>
                                                            {proj.size && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{formatSize(proj.size)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleLoad(proj.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md transition-colors"
                                                            title="Open Project"
                                                        >
                                                            <FolderOpen className="w-3.5 h-3.5" />
                                                            Open
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(proj.id, e)}
                                                            className="p-1.5 text-on-surface-variant hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                            title="Delete Project"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="px-6 py-2 bg-surface-container border-t border-outline-variant text-[10px] text-on-surface-variant text-center">
                        Connected to {provider.name}
                        {redirectUri && <span className="ml-2 opacity-50">({redirectUri})</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloudModal;
