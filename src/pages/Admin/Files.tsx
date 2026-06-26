import PageMeta from "../../components/common/PageMeta";
import { FileIcon, DownloadIcon } from "../../icons";
import { useFiles } from "../../hooks/useFiles";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useRef, useState, useEffect } from "react";
import { safeParse } from "../../lib/storage";
import { FileVisibility } from "../../types";
import { notifyDeliverableUploaded } from "../../services/notificationHelpers";

interface SimpleClient {
  id: string;
  name?: string;
  contactName?: string;
  companyName?: string;
  company?: string;
}

interface SimpleProject {
  id: string;
  name: string;
  clientId: string;
}

interface UserProfile {
  id: string;
  full_name?: string;
  role?: string;
  departmentId?: string;
}

const CLIENTS_KEY  = "optivax_clients";
const PROJECTS_KEY = "mock_projects";
const PROFILES_KEY = "mock_profiles";

const VISIBILITY_OPTIONS: { value: FileVisibility; label: string; description: string }[] = [
  { value: "private",      label: "Private",        description: "Only you can see this file" },
  { value: "department",   label: "Department",      description: "Everyone in your department" },
  { value: "specific",     label: "Specific Users",  description: "Choose specific team members" },
  { value: "project-team", label: "Project Team",    description: "Everyone assigned to the project" },
  { value: "client",       label: "Client",          description: "The client attached to this file" },
];

function loadClients(): SimpleClient[] {
  return safeParse<SimpleClient[]>(localStorage.getItem(CLIENTS_KEY) ?? "[]", []);
}
function loadProjects(): SimpleProject[] {
  return safeParse<SimpleProject[]>(localStorage.getItem(PROJECTS_KEY) ?? "[]", []);
}
function loadProfiles(): UserProfile[] {
  return safeParse<UserProfile[]>(localStorage.getItem(PROFILES_KEY) ?? "[]", []);
}
function clientLabel(c: SimpleClient): string {
  return c.name || c.contactName || c.companyName || c.company || c.id;
}

const VIS_BADGE_COLORS: Record<string, string> = {
  private:        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  department:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  specific:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "project-team": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  client:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function Files() {
  const { files, isLoading, uploadFile, deleteFile } = useFiles();
  const { user, canCreate, canDelete } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [clients, setClients]       = useState<SimpleClient[]>([]);
  const [allProjects, setAllProjects] = useState<SimpleProject[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);

  const [selectedClientId, setSelectedClientId]     = useState("");
  const [selectedProjectId, setSelectedProjectId]   = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [description, setDescription] = useState("");

  const [visibility, setVisibility]   = useState<FileVisibility>("department");
  const [visibleTo, setVisibleTo]     = useState<string[]>([]);
  const [userSearch, setUserSearch]   = useState("");

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (showUploadModal) {
      setClients(loadClients());
      setAllProjects(loadProjects());
      setAllProfiles(loadProfiles());
      setStep(1);
      setSelectedClientId("");
      setSelectedProjectId("");
      setSelectedProjectName("");
      setDescription("");
      setVisibility("department");
      setVisibleTo([]);
      setUserSearch("");
    }
  }, [showUploadModal]);

  const clientProjects  = allProjects.filter((p) => p.clientId === selectedClientId);
  const selectedClient  = clients.find((c) => c.id === selectedClientId);
  const selectedProject = allProjects.find((p) => p.id === selectedProjectId);

  // For "specific" visibility: show all staff (not clients)
  const pickableUsers = allProfiles.filter(
    (p) => p.role && p.role !== "client" && p.id !== user?.id
  );
  const filteredUsers = userSearch.trim()
    ? pickableUsers.filter(
        (p) =>
          (p.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
          (p.role || "").toLowerCase().includes(userSearch.toLowerCase())
      )
    : pickableUsers;

  const toggleUser = (uid: string) => {
    setVisibleTo((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await uploadFile(selectedFile, {
        uploadedBy:   user?.name,
        uploadedById: user?.id,
        uploaderDept: user?.departmentId,
        clientId:     selectedClientId  || undefined,
        projectId:    selectedProjectId || undefined,
        projectName:  selectedProjectName || undefined,
        description:  description       || undefined,
        visibility,
        visibleTo:    visibility === "specific" ? visibleTo : undefined,
      } as any);
      showToast("File uploaded successfully", "success");
      if (user) {
        const clientName = selectedClient ? clientLabel(selectedClient) : "";
        notifyDeliverableUploaded(
          user.id, user.name, user.role,
          selectedFile.name,
          `file-${Date.now()}`,
          clientName || "Internal"
        );
      }
      setShowUploadModal(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to upload file", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      try {
        await deleteFile(id);
        showToast("File deleted successfully", "success");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Failed to delete file", "error");
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const visBadge = (vis?: string) => {
    if (!vis) return null;
    const colors = VIS_BADGE_COLORS[vis] || "bg-gray-100 text-gray-600";
    const label  = VISIBILITY_OPTIONS.find((o) => o.value === vis)?.label || vis;
    return (
      <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
        {label}
      </span>
    );
  };

  const StepDot = ({ n }: { n: number }) => (
    <div className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"}`} />
  );

  return (
    <>
      <PageMeta title="Files | Optivax Global" description="Manage project files and documents." />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Files</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Upload and manage project files and documents.</p>
        </div>
        {canCreate("files") && (
          <button onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700">
            Upload File
          </button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Files</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
              </div>
            ) : files.length === 0 ? (
              <div className="col-span-full text-center p-8 text-gray-500 dark:text-gray-400">No files uploaded yet.</div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="flex flex-col p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-start">
                    <FileIcon className="w-8 h-8 text-gray-400 mr-3 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate" title={file.name}>{file.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatSize(file.size)} · {file.uploadDate?.slice(0, 10)}</p>
                      {(file as any).projectName && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {(file as any).projectName}
                        </span>
                      )}
                      {visBadge(file.visibility)}
                      {(file as any).description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{(file as any).description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <a href={file.url || "#"} download={file.name} target="_blank" rel="noreferrer"
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <DownloadIcon className="w-4 h-4" />
                      </a>
                      {canDelete("files") && (
                        <button onClick={() => handleDelete(file.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 4-Step Upload Modal ───────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowUploadModal(false)} />
          <div className="relative z-50 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload File</h3>
                <p className="text-xs text-gray-400 mt-0.5">Step {step} of 4</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>

            <div className="flex px-6 pt-4 gap-1.5">
              {[1, 2, 3, 4].map((s) => <StepDot key={s} n={s} />)}
            </div>

            <div className="p-6 space-y-4">

              {/* Step 1: Select Client (optional) */}
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">1</span>
                      Select Client <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                      <option value="">No specific client</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-between">
                    <button onClick={() => { setSelectedClientId(""); setStep(2); }}
                      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400">
                      Skip
                    </button>
                    <button onClick={() => setStep(2)}
                      className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                      Next
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Select Project (optional) */}
              {step === 2 && (
                <>
                  {selectedClient && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Client: <strong className="text-gray-900 dark:text-white">{clientLabel(selectedClient)}</strong>
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">2</span>
                      Select Project <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    {selectedClientId && clientProjects.length === 0 ? (
                      <p className="text-xs text-amber-600 py-2">No projects for this client.</p>
                    ) : (
                      <select value={selectedProjectId}
                        onChange={(e) => {
                          const p = (selectedClientId ? clientProjects : allProjects).find((p) => p.id === e.target.value);
                          setSelectedProjectId(e.target.value);
                          setSelectedProjectName(p?.name ?? "");
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="">No specific project</option>
                        {(selectedClientId ? clientProjects : allProjects).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Q2 report, brand assets…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                  </div>
                  <div className="flex justify-between">
                    <button onClick={() => setStep(1)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                      Back
                    </button>
                    <button onClick={() => setStep(3)}
                      className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                      Next
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Choose Visibility */}
              {step === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">3</span>
                      File Visibility
                    </label>
                    <div className="space-y-2">
                      {VISIBILITY_OPTIONS.map((opt) => (
                        <label key={opt.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            visibility === opt.value
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                          }`}>
                          <input type="radio" name="visibility" value={opt.value}
                            checked={visibility === opt.value}
                            onChange={() => { setVisibility(opt.value); setVisibleTo([]); }}
                            className="mt-0.5 text-brand-500 focus:ring-brand-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* User picker for "specific" visibility */}
                  {visibility === "specific" && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                      <input type="text" placeholder="Search users…" value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {filteredUsers.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1">
                            <input type="checkbox" checked={visibleTo.includes(p.id)}
                              onChange={() => toggleUser(p.id)}
                              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                            <span className="text-sm text-gray-900 dark:text-white">{p.full_name || p.id}</span>
                            <span className="text-xs text-gray-400 ml-auto capitalize">{p.role?.replace(/_/g, " ")}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">{visibleTo.length} user{visibleTo.length !== 1 ? "s" : ""} selected</p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button onClick={() => setStep(2)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                      Back
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      disabled={visibility === "specific" && visibleTo.length === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">
                      Next
                    </button>
                  </div>
                </>
              )}

              {/* Step 4: Upload File */}
              {step === 4 && (
                <>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                    {selectedClient && <div><strong>Client:</strong> {clientLabel(selectedClient)}</div>}
                    {selectedProject && <div><strong>Project:</strong> {selectedProject.name}</div>}
                    {description && <div><strong>Description:</strong> {description}</div>}
                    <div><strong>Visibility:</strong> {VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label}</div>
                    {visibility === "specific" && <div><strong>Shared with:</strong> {visibleTo.length} user{visibleTo.length !== 1 ? "s" : ""}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold mr-1.5">4</span>
                      Choose File to Upload
                    </label>
                    <input ref={fileInputRef} type="file" onChange={handleFileChange}
                      disabled={isUploading}
                      className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-gray-700 dark:file:text-gray-200 disabled:opacity-50" />
                    {isUploading && <p className="text-xs text-brand-600 mt-1">Uploading…</p>}
                  </div>
                  <div className="flex justify-between">
                    <button onClick={() => setStep(3)} disabled={isUploading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 disabled:opacity-50">
                      Back
                    </button>
                    <button onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400">
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
