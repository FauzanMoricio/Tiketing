"use client";

import { useState, useTransition, useRef, useEffect, DragEvent } from "react";
import { 
  Folder, 
  File, 
  FileImage, 
  FileText, 
  FileArchive, 
  Video, 
  Search, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Plus, 
  X, 
  ChevronRight, 
  Grid, 
  List, 
  Loader2,
  FolderPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  createFolder, 
  deleteFolder, 
  uploadProjectFile, 
  deleteProjectFile 
} from "@/actions/file.actions";

interface DBFolder {
  id: string;
  name: string;
  createdAt: Date;
}

interface DBFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  folderId: string | null;
  createdAt: Date;
  uploadedBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface FilesExplorerProps {
  projectId: string;
  workspaceId: string;
  spaceId: string;
  initialFolders: DBFolder[];
  initialFiles: DBFile[];
  isViewer: boolean;
}

export function FilesExplorer({
  projectId,
  workspaceId,
  spaceId,
  initialFolders,
  initialFiles,
  isViewer,
}: FilesExplorerProps) {
  const [folders, setFolders] = useState<DBFolder[]>(initialFolders);
  const [files, setFiles] = useState<DBFile[]>(initialFiles);
  const [isPending, startTransition] = useTransition();

  // Sync state when props change (fixes "refresh needed" caching issue on page transitions)
  useEffect(() => {
    setFolders((prev) => {
      if (prev === initialFolders) return prev;
      return initialFolders;
    });
  }, [initialFolders]);

  useEffect(() => {
    setFiles((prev) => {
      if (prev === initialFiles) return prev;
      return initialFiles;
    });
  }, [initialFiles]);

  // Navigation States
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection / Modal States
  const [selectedFile, setSelectedFile] = useState<DBFile | null>(null);
  const [previewFile, setPreviewFile] = useState<DBFile | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Upload States
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder Delete Confirmation state
  const [folderToDeleteId, setFolderToDeleteId] = useState<string | null>(null);
  const [fileToDeleteId, setFileToDeleteId] = useState<string | null>(null);

  // Helper: Format byte sizes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Helper: Get icon based on file mime type or extension
  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const type = mimeType.toLowerCase();

    if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) {
      return <FileImage className="h-8 w-8 text-indigo-400 shrink-0" />;
    }
    if (type.startsWith("video/") || ["mp4", "webm", "ogg", "mov", "avi"].includes(ext || "")) {
      return <Video className="h-8 w-8 text-rose-400 shrink-0" />;
    }
    if (type.includes("pdf") || ext === "pdf") {
      return <FileText className="h-8 w-8 text-orange-400 shrink-0" />;
    }
    if (type.includes("zip") || type.includes("tar") || type.includes("rar") || ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
      return <FileArchive className="h-8 w-8 text-amber-400 shrink-0" />;
    }
    // Default document or file
    return <FileText className="h-8 w-8 text-sky-400 shrink-0" />;
  };

  // Check if file fits the current category tab
  const matchesCategory = (file: DBFile) => {
    if (activeCategory === "All") return true;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const type = file.type.toLowerCase();

    if (activeCategory === "Images") {
      return type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "");
    }
    if (activeCategory === "Documents") {
      return type.includes("pdf") || type.includes("word") || type.includes("sheet") || 
        ["pdf", "docx", "doc", "xlsx", "xls", "pptx", "txt"].includes(ext || "");
    }
    if (activeCategory === "Videos") {
      return type.startsWith("video/") || ["mp4", "webm", "ogg", "mov", "avi"].includes(ext || "");
    }
    if (activeCategory === "Archives") {
      return type.includes("zip") || type.includes("rar") || ["zip", "rar", "7z"].includes(ext || "");
    }
    return true;
  };

  // Filtered lists
  const filteredFolders = folders.filter(f => 
    !currentFolderId && f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(f => {
    // If searching, ignore folder constraint so we search globally
    const matchesFolder = searchQuery.trim() !== "" ? true : (f.folderId === currentFolderId);
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch && matchesCategory(f);
  });

  // Folder Breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs = [{ id: null, name: "Root" }];
    if (currentFolderId) {
      const active = folders.find(f => f.id === currentFolderId);
      if (active) {
        crumbs.push({ id: active.id as any, name: active.name });
      }
    }
    return crumbs;
  };

  // Create Folder
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    startTransition(async () => {
      try {
        const created = await createFolder(projectId, newFolderName.trim());
        setFolders(prev => [created, ...prev]);
        setNewFolderName("");
        setIsFolderModalOpen(false);
        toast.success("Folder created successfully");
      } catch (err) {
        toast.error("Failed to create folder");
      }
    });
  };

  // Delete Folder
  const handleConfirmDeleteFolder = async () => {
    if (!folderToDeleteId) return;

    startTransition(async () => {
      try {
        await deleteFolder(folderToDeleteId);
        setFolders(prev => prev.filter(f => f.id !== folderToDeleteId));
        // Move files in deleted folder to root in local state
        setFiles(prev => prev.map(f => f.folderId === folderToDeleteId ? { ...f, folderId: null } : f));
        setFolderToDeleteId(null);
        toast.success("Folder deleted");
      } catch (err) {
        toast.error("Failed to delete folder");
      }
    });
  };

  // Handle File Upload from Input/Drop
  const processUpload = (file: File) => {
    if (isViewer) return;
    setUploadFileName(file.name);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;

      // Simulate network upload progress for a premium feel
      let progress = 0;
      const interval = setInterval(async () => {
        progress += 20;
        setUploadProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          startTransition(async () => {
            try {
              const uploaded = await uploadProjectFile({
                projectId,
                folderId: currentFolderId,
                name: file.name,
                size: file.size,
                type: file.type || "application/octet-stream",
                base64Data,
              });

              setFiles(prev => [uploaded as any, ...prev]);
              toast.success(`${file.name} uploaded successfully!`);
            } catch (err) {
              toast.error("Failed to upload file");
            } finally {
              setUploadProgress(null);
              setUploadFileName("");
            }
          });
        }
      }, 100);
    };

    reader.readAsDataURL(file);
  };

  // File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
      e.target.value = ""; // Reset input so same file can be uploaded again consecutively
    }
  };

  // Drag and Drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isViewer) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  // Delete File
  const handleConfirmDeleteFile = async () => {
    if (!fileToDeleteId) return;

    startTransition(async () => {
      try {
        await deleteProjectFile(fileToDeleteId);
        setFiles(prev => prev.filter(f => f.id !== fileToDeleteId));
        if (selectedFile?.id === fileToDeleteId) {
          setSelectedFile(null);
        }
        setFileToDeleteId(null);
        toast.success("File deleted successfully");
      } catch (err) {
        toast.error("Failed to delete file");
      }
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 w-full bg-background border border-border/40 rounded-2xl overflow-hidden shadow-sm">
      
      {/* ── Left Workspace Panel: Folders & Files Explorer ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 bg-card/10">
        
        {/* Navigation Toolbar */}
        <div className="px-6 py-4 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/5 shrink-0">
          
          {/* Breadcrumbs path */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium overflow-x-auto py-1 scrollbar-none">
            {getBreadcrumbs().map((crumb, idx) => (
              <div key={crumb.name} className="flex items-center shrink-0">
                {idx > 0 && <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground/50" />}
                <button
                  onClick={() => {
                    setCurrentFolderId(crumb.id);
                    setSelectedFile(null);
                  }}
                  className={`hover:text-foreground cursor-pointer transition-colors bg-transparent border-0 font-semibold p-0 ${
                    crumb.id === currentFolderId ? "text-foreground font-bold" : ""
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Action buttons / Search */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full md:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex border border-border/80 rounded-xl overflow-hidden shrink-0 bg-background">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`h-7 w-7 rounded-none ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              >
                <Grid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={`h-7 w-7 rounded-none ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            {!isViewer && !currentFolderId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFolderModalOpen(true)}
                className="gap-1.5 rounded-xl text-xs h-8 shrink-0"
              >
                <FolderPlus className="h-3.5 w-3.5 text-primary" />
                New Folder
              </Button>
            )}
          </div>
        </div>

        {/* Categories Tab Selector */}
        <div className="px-6 py-2 bg-muted/20 border-b border-border/30 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {["All", "Images", "Documents", "Videos", "Archives"].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedFile(null);
                }}
                className={`px-3 py-1 rounded-full cursor-pointer transition-all border font-semibold ${
                  activeCategory === cat 
                    ? "bg-primary/10 text-primary border-primary/20" 
                    : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold text-muted-foreground shrink-0 uppercase tracking-widest">
            {filteredFiles.length} files {!currentFolderId ? `• ${filteredFolders.length} folders` : ""}
          </span>
        </div>

        {/* Main Contents (Scrollable Grid or List) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          
          {/* File Upload Zone (Visible if not viewer) */}
          {!isViewer && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => {
                if (uploadProgress === null) {
                  fileInputRef.current?.click();
                }
              }}
              className={`border-2 border-dashed border-border/60 hover:border-primary/50 transition-all rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-card/20 hover:bg-primary/[0.01] group relative shrink-0 ${
                uploadProgress !== null ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              
              {uploadProgress !== null ? (
                <div className="w-full max-w-xs space-y-2">
                  <Loader2 className="h-7 w-7 text-primary animate-spin mx-auto" />
                  <p className="text-xs font-bold text-foreground truncate">Uploading {uploadFileName}</p>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-100" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-primary">{uploadProgress}% complete</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground/50 group-hover:text-primary transition-colors mb-2.5" />
                  <span className="text-xs font-bold text-foreground">Click to upload or drag & drop files here</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Images, PDFs, Word, Spreadsheets, Videos, Archives up to 50MB</span>
                </>
              )}
            </div>
          )}

          {/* Folders List (Only shown at Root view) */}
          {!currentFolderId && filteredFolders.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Folders</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    onDoubleClick={() => setCurrentFolderId(folder.id)}
                    className="bg-card border border-border/40 hover:border-border rounded-xl p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-muted/10 group transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0" onClick={() => setCurrentFolderId(folder.id)}>
                      <Folder className="h-5 w-5 text-amber-500 shrink-0 fill-amber-500/20" />
                      <span className="text-xs font-bold text-foreground truncate">{folder.name}</span>
                    </div>
                    {!isViewer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToDeleteId(folder.id);
                        }}
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity border-0 bg-transparent cursor-pointer"
                        title="Delete folder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files List / Grid */}
          <div className="space-y-2 min-h-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Files</span>
            
            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-card/20 border border-border/30 rounded-xl">
                <File className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold text-muted-foreground">No files found in this folder</p>
              </div>
            ) : viewMode === "grid" ? (
              
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFile?.id === file.id;
                  const ext = file.name.split(".").pop()?.toLowerCase() || "";
                  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);

                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`bg-card border rounded-xl p-3.5 flex flex-col gap-3 shadow-sm hover:border-border transition-all group relative cursor-pointer ${
                        isSelected ? "border-primary ring-1 ring-primary/30" : "border-border/50"
                      }`}
                    >
                      {/* Image Thumbnail / File Icon container */}
                      <div className="h-28 w-full bg-muted/40 rounded-lg flex items-center justify-center overflow-hidden border border-border/20 relative select-none">
                        {isImage ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          getFileIcon(file.name, file.type)
                        )}

                        {/* Top quick actions overlay */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm p-1 rounded-lg">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFile(file);
                            }}
                            className="p-1 hover:bg-white/10 text-white rounded border-0 bg-transparent cursor-pointer"
                            title="Preview"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          <a
                            href={file.url}
                            download={file.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 hover:bg-white/10 text-white rounded border-0 bg-transparent cursor-pointer flex items-center justify-center"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                          {!isViewer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileToDeleteId(file.id);
                              }}
                              className="p-1 hover:bg-rose-500/20 text-rose-400 rounded border-0 bg-transparent cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                          <span>{formatBytes(file.size)}</span>
                          <span>{new Date(file.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              
              /* LIST VIEW */
              <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/30 bg-card/30">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFile?.id === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`p-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/10 transition-colors ${
                        isSelected ? "bg-primary/[0.02]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(file.name, file.type)}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate" title={file.name}>{file.name}</p>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{file.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 text-xs">
                        <span className="text-muted-foreground font-medium">{formatBytes(file.size)}</span>
                        <span className="text-muted-foreground font-medium hidden md:inline">
                          {new Date(file.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFile(file);
                            }}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded border-0 bg-transparent cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={file.url}
                            download={file.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded border-0 bg-transparent cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          {!isViewer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileToDeleteId(file.id);
                              }}
                              className="p-1 hover:bg-muted text-muted-foreground hover:text-rose-500 rounded border-0 bg-transparent cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Details Panel: File Metadata / Details ─────────────────────────────────────────────── */}
      {selectedFile && (
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border/40 bg-muted/5 flex flex-col shrink-0">
          <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/10">
            <h3 className="text-xs font-bold text-foreground">File Details</h3>
            <button 
              onClick={() => setSelectedFile(null)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Visual Preview */}
            <div className="h-36 w-full bg-background border border-border/40 rounded-xl flex items-center justify-center overflow-hidden relative">
              {["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(selectedFile.name.split(".").pop()?.toLowerCase() || "") ? (
                <img
                  src={selectedFile.url}
                  alt={selectedFile.name}
                  className="h-full w-full object-contain cursor-zoom-in"
                  onClick={() => setPreviewFile(selectedFile)}
                />
              ) : (
                getFileIcon(selectedFile.name, selectedFile.type)
              )}
            </div>

            {/* Information Grid */}
            <div className="space-y-4 text-[11px]">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Name</span>
                <span className="font-bold text-foreground break-all leading-normal block">{selectedFile.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Size</span>
                  <span className="font-semibold text-foreground block">{formatBytes(selectedFile.size)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Format</span>
                  <span className="font-semibold text-foreground uppercase block">{selectedFile.name.split(".").pop()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Uploaded By</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {selectedFile.uploadedBy.image ? (
                    <img 
                      src={selectedFile.uploadedBy.image} 
                      alt="" 
                      className="h-5 w-5 rounded-full object-cover border border-border/50 shrink-0" 
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                      {selectedFile.uploadedBy.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="font-semibold text-foreground truncate">{selectedFile.uploadedBy.name || "Unknown"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Date Uploaded</span>
                <span className="font-semibold text-foreground block">
                  {new Date(selectedFile.createdAt).toLocaleDateString(undefined, { 
                    month: "long", 
                    day: "numeric", 
                    year: "numeric", 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/40 flex items-center gap-2 shrink-0 bg-muted/10">
            <a
              href={selectedFile.url}
              download={selectedFile.name}
              className="flex-1"
            >
              <Button size="sm" className="w-full gap-1.5 rounded-lg text-xs h-8">
                <Download className="h-3.5 w-3.5" />
                Download File
              </Button>
            </a>
            {!isViewer && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFileToDeleteId(selectedFile.id)}
                className="h-8 w-8 rounded-lg p-0 text-rose-500 hover:bg-rose-500/10 shrink-0 border-border/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── IMAGE PREVIEW LIGHTBOX MODAL ────────────────────────────────────────────────────────── */}
      {previewFile && (
        <div 
          onClick={() => setPreviewFile(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <button
            onClick={() => setPreviewFile(null)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 text-white/70 hover:text-white rounded-full border-0 bg-transparent cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center justify-center select-none"
          >
            {["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(previewFile.name.split(".").pop()?.toLowerCase() || "") ? (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="bg-card border border-border p-12 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm">
                {getFileIcon(previewFile.name, previewFile.type)}
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground leading-normal">{previewFile.name}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{previewFile.type}</p>
                </div>
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                >
                  <Button size="sm" className="gap-1.5 rounded-lg text-xs mt-2">
                    <Download className="h-4 w-4" />
                    Download to Open
                  </Button>
                </a>
              </div>
            )}
            <p className="text-xs font-bold text-white/80 mt-4 truncate max-w-lg bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full">
              {previewFile.name} ({formatBytes(previewFile.size)})
            </p>
          </div>
        </div>
      )}

      {/* ── CREATE FOLDER MODAL ──────────────────────────────────────────────────────────────────── */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4.5 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="text-xs font-bold text-foreground">Create New Folder</h2>
              <button 
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolderSubmit} className="p-4.5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Folder Name</label>
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Design Assets, Requirements..." 
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsFolderModalOpen(false)}
                  className="rounded-lg text-xs h-8 px-3"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="rounded-lg text-xs h-8 px-4"
                >
                  {isPending ? "Creating..." : "Create Folder"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CUSTOM CONFIRMATION DELETE FOLDER DIALOG ────────────────────────────────────────────── */}
      {folderToDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-foreground">Delete Folder?</h3>
                <p className="text-[10px] text-muted-foreground">Files inside this folder will not be deleted, they will be moved back to the root folder.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFolderToDeleteId(null)}
                className="rounded-lg text-[10px] h-8 px-3"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleConfirmDeleteFolder}
                className="rounded-lg text-[10px] h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM CONFIRMATION DELETE FILE DIALOG ──────────────────────────────────────────────── */}
      {fileToDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-foreground">Delete File?</h3>
                <p className="text-[10px] text-muted-foreground">This will permanently delete the file from the database and storage.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFileToDeleteId(null)}
                className="rounded-lg text-[10px] h-8 px-3"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleConfirmDeleteFile}
                className="rounded-lg text-[10px] h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
