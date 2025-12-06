
import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { GalleryPhoto } from '../types';

interface GalleryProps {
  isAdmin?: boolean;
}

const Gallery: React.FC<GalleryProps> = ({ isAdmin }) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('uploadedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryPhoto));
      setPhotos(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching gallery:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `gallery/${timestamp}_${uploadFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, uploadFile);

      uploadTask.on('state_changed', 
        null, 
        (error) => {
          console.error("Upload failed", error);
          alert("업로드 실패");
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'gallery'), {
            imageUrl: downloadURL,
            description: description,
            uploadedAt: new Date().toISOString()
          });
          
          // Reset form
          setUploadFile(null);
          setDescription('');
          setShowUploadForm(false);
          setIsUploading(false);
          alert("사진이 등록되었습니다.");
        }
      );
    } catch (error) {
      console.error("Error adding photo:", error);
      setIsUploading(false);
    }
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!window.confirm("정말로 이 사진을 삭제하시겠습니까?")) return;

    try {
      // 1. Delete from Firestore
      await deleteDoc(doc(db, 'gallery', photo.id));

      // 2. Try to delete from Storage (Optional: Ignore error if file not found)
      try {
          // Extract path from URL roughly or store storage path in DB. 
          // For simplicity, we assume we might leave orphaned files or need accurate path.
          // Since we used `gallery/${timestamp}_${name}`, reconstructing exact ref from URL is tricky 
          // without storing the ref path. 
          // For now, we only delete the DB record to remove it from view.
          // Ideally: Store `storagePath` in Firestore when uploading.
          
          // Let's try to delete by refFromURL provided by Firebase SDK
          const fileRef = ref(storage, photo.imageUrl);
          await deleteObject(fileRef);
      } catch (e) {
          console.warn("Storage file delete skipped or failed", e);
      }
      
      if (selectedPhoto?.id === photo.id) setSelectedPhoto(null);
    } catch (error) {
      console.error("Delete failed", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <i className="fas fa-images text-brand-600"></i>
          현장 갤러리
        </h2>
        {isAdmin && (
          <button 
            onClick={() => setShowUploadForm(!showUploadForm)}
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${showUploadForm ? 'bg-slate-800 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
          >
            {showUploadForm ? '닫기' : '+ 사진 등록'}
          </button>
        )}
      </div>

      {/* Admin Upload Form */}
      {isAdmin && showUploadForm && (
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-brand-100 mb-8 animate-fade-in-up">
           <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadFile ? (
                    <div className="text-brand-600 font-bold">
                        <i className="fas fa-check-circle mr-2"></i>
                        {uploadFile.name}
                    </div>
                  ) : (
                    <div className="text-gray-500">
                        <i className="fas fa-cloud-upload-alt text-3xl mb-2"></i>
                        <p className="text-sm">클릭하여 현장 사진을 선택하세요</p>
                    </div>
                  )}
              </div>
              
              <input 
                type="text" 
                placeholder="사진 설명 (선택사항)" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 outline-none text-sm"
              />

              <button 
                type="submit" 
                disabled={!uploadFile || isUploading}
                className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:bg-gray-300 transition-colors shadow-sm"
              >
                {isUploading ? <><i className="fas fa-spinner fa-spin mr-2"></i>업로드 중...</> : '갤러리에 게시하기'}
              </button>
           </form>
        </div>
      )}

      {/* Photo Grid (Masonry-like using columns) */}
      {photos.length === 0 ? (
          <div className="text-center py-20 bg-gray-100 rounded-2xl border border-dashed border-gray-300 text-gray-400">
              <i className="far fa-image text-4xl mb-3"></i>
              <p>등록된 현장 사진이 없습니다.</p>
          </div>
      ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {photos.map((photo) => (
              <div 
                key={photo.id} 
                className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-gray-200 cursor-pointer shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img 
                    src={photo.imageUrl} 
                    alt={photo.description || '현장 사진'} 
                    className="w-full h-auto object-cover"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <p className="text-white text-sm font-medium line-clamp-2">{photo.description}</p>
                    <span className="text-xs text-gray-300 mt-1">{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedPhoto(null)}
        >
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <img 
                    src={selectedPhoto.imageUrl} 
                    alt={selectedPhoto.description} 
                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
                />
                
                <div className="mt-4 text-center w-full">
                    {selectedPhoto.description && (
                        <p className="text-white text-lg font-medium mb-1 drop-shadow-md">{selectedPhoto.description}</p>
                    )}
                    <p className="text-gray-400 text-sm">
                        {new Date(selectedPhoto.uploadedAt).toLocaleString()}
                    </p>
                </div>

                <button 
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute -top-12 right-0 text-white/70 hover:text-white p-2"
                >
                    <i className="fas fa-times text-2xl"></i>
                </button>

                {isAdmin && (
                    <button 
                        onClick={() => handleDelete(selectedPhoto)}
                        className="absolute bottom-0 right-0 translate-y-full mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 shadow-lg flex items-center gap-2"
                    >
                        <i className="fas fa-trash"></i> 삭제하기
                    </button>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
