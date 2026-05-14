import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { db } from './lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Routine, Day, Exercise, ExerciseMedia } from './types';
import { 
  Plus, 
  Trash2, 
  ChevronRight,
  Calendar, 
  Dumbbell, 
  LogOut, 
  Settings, 
  Clock, 
  PlusCircle,
  X,
  Image as ImageIcon,
  Upload,
  Search,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from './lib/firebase';

const GYM_IMAGES = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop", // Squat/Legs
  "https://images.unsplash.com/photo-1541534741688-6078c64b5913?q=80&w=600&auto=format&fit=crop", // Barbell/Shoulders
  "https://images.unsplash.com/photo-1581009146145-b5ef03a7401f?q=80&w=600&auto=format&fit=crop", // Dumbbells/Arms
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop", // Bench/Chest
  "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=600&auto=format&fit=crop", // Pull up/Back
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop", // Gym interior
  "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop", // Kettlebell
  "https://images.unsplash.com/photo-1574673130244-c207a9ec9035?q=80&w=600&auto=format&fit=crop", // Deadlift
  "https://images.unsplash.com/photo-1434596954605-9988b48de9a9?q=80&w=600&auto=format&fit=crop"  // Cardio
];

function getExerciseImage(name: string, customMedia: Record<string, string> = {}, fallbackUrl?: string) {
  const upperName = name.trim().toUpperCase();
  
  // 1. Check user's custom library first
  if (customMedia[upperName]) return customMedia[upperName];

  // 2. Use fallback from document if provided
  if (fallbackUrl) return fallbackUrl;

  const lowerNameSearch = name.toLowerCase();
  
  // 3. Keyword-based high-quality defaults
  if (lowerNameSearch.includes('pecho') || lowerNameSearch.includes('chest') || lowerNameSearch.includes('press')) {
    return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop";
  }
  if (lowerNameSearch.includes('sentadilla') || lowerNameSearch.includes('squat') || lowerNameSearch.includes('pierna') || lowerNameSearch.includes('leg')) {
    return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop";
  }
  if (lowerNameSearch.includes('espalda') || lowerNameSearch.includes('back') || lowerNameSearch.includes('pull') || lowerNameSearch.includes('remo') || lowerNameSearch.includes('row')) {
    return "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=600&auto=format&fit=crop";
  }
  if (lowerNameSearch.includes('brazo') || lowerNameSearch.includes('arm') || lowerNameSearch.includes('curl') || lowerNameSearch.includes('bicep') || lowerNameSearch.includes('tricep')) {
    return "https://images.unsplash.com/photo-1581009146145-b5ef03a7401f?q=80&w=600&auto=format&fit=crop";
  }
  if (lowerNameSearch.includes('hombro') || lowerNameSearch.includes('shoulder') || lowerNameSearch.includes('militar')) {
    return "https://images.unsplash.com/photo-1541534741688-6078c64b5913?q=80&w=600&auto=format&fit=crop";
  }
  if (lowerNameSearch.includes('peso muerto') || lowerNameSearch.includes('deadlift')) {
    return "https://images.unsplash.com/photo-1574673130244-c207a9ec9035?q=80&w=600&auto=format&fit=crop";
  }
  if (lowerNameSearch.includes('abs') || lowerNameSearch.includes('abdominal') || lowerNameSearch.includes('core') || lowerNameSearch.includes('plancha') || lowerNameSearch.includes('plank')) {
    return "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop";
  }

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GYM_IMAGES[hash % GYM_IMAGES.length];
}

export default function App() {
  const { user, loading, isLoggingIn, login, logout } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [customMedia, setCustomMedia] = useState<Record<string, string>>({});
  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch custom media
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'exerciseMedia'),
      where('userId', '==', user.uid)
    );
    return onSnapshot(q, (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map[data.exerciseName.toUpperCase()] = data.imageUrl;
      });
      setCustomMedia(map);
    });
  }, [user]);

  // Fetch routines
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'routines'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Routine));
      setRoutines(docs);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-indigo-900 shadow-xl shadow-indigo-200/50 animate-bounce">
            <Dumbbell className="w-8 h-8" />
          </div>
          <p className="text-xs font-black tracking-widest uppercase opacity-40">Inicializando Motor</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_0%,#e0e7ff_0%,transparent_100%)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-12"
        >
          <div className="relative inline-block">
            <div className="p-6 rounded-[32px] bg-indigo-600 text-white shadow-2xl shadow-indigo-300 relative z-10">
              <Dumbbell className="w-16 h-16" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-full h-full bg-yellow-400 rounded-[32px] -z-0"></div>
          </div>
          <div className="space-y-3">
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic">IronFlow</h1>
            <p className="text-slate-500 font-medium text-lg">Tu arquitecto de rutinas de alto rendimiento.</p>
          </div>
          <button 
            onClick={login}
            disabled={isLoggingIn}
            className={`w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-indigo-100 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoggingIn ? 'Iniciando sesión...' : 'Acceder al Panel'}
            {!isLoggingIn && <ChevronRight className="w-6 h-6" />}
          </button>
        </motion.div>
      </div>
    );
  }

  const handleCreateRoutine = async () => {
    if (!newRoutineName.trim()) return;
    
    // Weekly limit check
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const targetDate = new Date(now);
    targetDate.setDate(diff);
    const monday = targetDate.toISOString().split('T')[0];
    
    const countThisWeek = routines.filter(r => r.weekStart === monday).length;
    if (countThisWeek >= 2) {
      alert("Presupuesto de rutinas semanal agotado (Límite: 2). Reinicio el lunes.");
      return;
    }

    try {
      const routineRef = await addDoc(collection(db, 'routines'), {
        userId: user.uid,
        name: newRoutineName,
        weekStart: monday,
        createdAt: serverTimestamp(),
      });
      
      // Add default days
      const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      for (let i = 0; i < days.length; i++) {
        await addDoc(collection(db, 'routines', routineRef.id, 'days'), {
          routineId: routineRef.id,
          userId: user.uid,
          name: days[i],
          order: i,
          createdAt: serverTimestamp(),
        });
      }

      setNewRoutineName('');
      setShowNewRoutineModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteRoutine = async (id: string) => {
    if (!confirm("¿Deseas eliminar esta rutina? Todos los datos de entrenamiento serán purgados.")) return;
    try {
      await deleteDoc(doc(db, 'routines', id));
      if (selectedRoutine?.id === id) setSelectedRoutine(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `routines/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-yellow-400 selection:text-indigo-900 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-indigo-600 p-4 flex items-center justify-between text-white shadow-lg z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center text-indigo-900 font-black text-sm">⚡</div>
          <span className="font-black text-lg tracking-tight uppercase">IRONFLOW</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-indigo-500 rounded-xl"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6 rotate-45" />}
        </button>
      </div>

      {/* Sidebar / Navigation */}
      <AnimatePresence>
        {(isMobileMenuOpen || window.innerWidth >= 768) && (
          <motion.nav 
            initial={window.innerWidth < 768 ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed md:sticky top-0 left-0 z-40 w-72 bg-indigo-600 flex flex-col h-screen text-white shadow-2xl transition-transform md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          >
            <div className="p-8 hidden md:flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-indigo-900 font-black text-xl shadow-lg">⚡</div>
                <span className="font-black text-2xl tracking-tight uppercase">IRONFLOW</span>
              </div>
              <button onClick={logout} className="p-2 opacity-50 hover:opacity-100 transition-all">
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-300">Mis Rutinas</span>
                <span className="text-[10px] font-bold bg-indigo-500 px-2 py-0.5 rounded-full">{routines.length}/2</span>
              </div>

              <button 
                onClick={() => {
                  setSelectedRoutine(null);
                  setShowMediaLibrary(true);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full mb-2 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  showMediaLibrary 
                    ? 'bg-indigo-500 text-white shadow-lg' 
                    : 'bg-indigo-700/30 text-indigo-200 hover:bg-indigo-700/50'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Librería Visual
              </button>

              <button 
                onClick={() => {
                  setShowMediaLibrary(false);
                  setShowNewRoutineModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full mb-6 p-4 border-2 border-dashed border-indigo-400/50 rounded-2xl text-indigo-100 text-sm font-bold hover:border-white hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Protocolo
              </button>

              {routines.map((routine) => (
                <div 
                  key={routine.id}
                  onClick={() => {
                    setSelectedRoutine(routine);
                    setShowMediaLibrary(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-l-4 ${
                    selectedRoutine?.id === routine.id 
                      ? 'bg-indigo-500 border-yellow-400 text-white shadow-lg' 
                      : 'bg-indigo-700/30 border-transparent text-indigo-200 hover:bg-indigo-700/50'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold tracking-tight text-sm truncate uppercase">{routine.name}</span>
                    <span className={`text-[10px] font-medium opacity-60 uppercase`}>
                       Sem {routine.weekStart.split('-')[1]} • {routine.weekStart.split('-')[0]}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteRoutine(routine.id); }}
                    className={`p-2 rounded-lg transition-all md:opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-red-400`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 bg-indigo-700/50 m-4 rounded-[32px] border border-indigo-400/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-400 overflow-hidden border-2 border-white/20 shrink-0">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs md:text-sm font-black truncate">{user.displayName}</span>
                    <span className="text-[9px] md:text-[10px] font-bold text-indigo-300 uppercase truncate">Operador: {user.uid.slice(0, 8)}</span>
                  </div>
                </div>
                <button onClick={logout} className="md:hidden p-2 text-indigo-300">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Modals and Overlays */}
        <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-20 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center pointer-events-none"
            >
               <img 
                src={fullscreenImage} 
                alt="Fullscreen" 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_80px_rgba(79,70,229,0.2)]"
               />
               <button 
                onClick={() => setFullscreenImage(null)}
                className="absolute top-0 right-0 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all pointer-events-auto"
               >
                 <X className="w-8 h-8" />
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showMediaLibrary ? (
          <MediaLibrary 
            key="media-library" 
            user={user} 
            onImageClick={(url) => setFullscreenImage(url)} 
          />
        ) : selectedRoutine ? (
          <RoutineView 
            key={selectedRoutine.id} 
            routine={selectedRoutine} 
            user={user} 
            customMedia={customMedia}
            onImageClick={(url) => setFullscreenImage(url)}
          />
        ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="w-32 h-32 mb-8 rounded-[40px] bg-white shadow-xl shadow-slate-200 flex items-center justify-center text-indigo-200">
                <Settings className="w-16 h-16 animate-[spin_10s_linear_infinite]" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Listo para el Despliegue</h2>
              <p className="text-slate-400 font-medium text-lg max-w-xs mt-4">
                Inicializa un nuevo protocolo de entrenamiento o selecciona una unidad existente para comenzar la optimización.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* New Routine Modal */}
      {showNewRoutineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-indigo-900/40 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-100 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl"
          >
            <div className="p-8 bg-indigo-600 flex items-center justify-between text-white">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-yellow-400" />
                Inicializar Protocolo
              </h3>
              <button onClick={() => setShowNewRoutineModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nombre en Clave</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  placeholder="EJ. RUTINA DE VERANO"
                  className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-slate-900 font-bold uppercase tracking-widest focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                />
              </div>
              <div className="p-5 bg-yellow-50 rounded-2xl flex items-center gap-5 border border-yellow-100">
                <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center text-indigo-900 shadow-md shadow-yellow-200">
                   <Clock className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest leading-none mb-1">División de Sesión</span>
                  <span className="text-sm font-bold text-indigo-900">Despliegue de Matriz de 7 Días</span>
                </div>
              </div>
              <button 
                onClick={handleCreateRoutine}
                disabled={!newRoutineName.trim()}
                className="w-full py-6 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 hover:shadow-2xl shadow-xl shadow-indigo-100 transition-all duration-300 disabled:opacity-30 active:scale-95"
              >
                Lanzar Protocolo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function MediaLibrary({ user, onImageClick }: { user: User, onImageClick: (url: string) => void }) {
  const [mediaItems, setMediaItems] = useState<ExerciseMedia[]>([]);
  const [exerciseName, setExerciseName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'exerciseMedia'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setMediaItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExerciseMedia)));
    }, (error) => {
      console.error('Error fetching media:', error);
    });
  }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !exerciseName.trim()) return;

    setUploading(true);
    try {
      // 1. Read file and compress using canvas
      const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              // Compress to jpeg with 0.7 quality to stay under 1MB easily
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              resolve(dataUrl);
            };
            img.onerror = reject;
          };
          reader.onerror = reject;
        });
      };

      console.log('[DEBUG] Comprimiendo imagen...');
      const compressedBase64 = await compressImage(file);
      
      if (compressedBase64.length > 1000000) {
        throw new Error('La imagen es demasiado grande incluso después de comprimir. Intenta con una imagen más pequeña.');
      }

      console.log('[DEBUG] Guardando en Firestore...');
      await addDoc(collection(db, 'exerciseMedia'), {
        userId: user.uid,
        exerciseName: exerciseName.trim().toUpperCase(),
        imageUrl: compressedBase64,
        createdAt: serverTimestamp(),
      });

      console.log('[DEBUG] ¡Éxito!');
      setExerciseName('');
      setFile(null);
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error) {
      console.error('[DEBUG] Error en subida:', error);
      alert(error instanceof Error ? error.message : 'Error al procesar la imagen');
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (id: string) => {
    if (!confirm('¿Eliminar esta imagen personalizada?')) return;
    try {
      await deleteDoc(doc(db, 'exerciseMedia', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `exerciseMedia/${id}`);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 md:p-20 max-w-6xl mx-auto space-y-12">
      <header className="space-y-4">
        <div className="flex items-center gap-4 text-indigo-600">
           <ImageIcon className="w-10 h-10" />
           <h2 className="text-5xl font-black uppercase tracking-tighter">Librería Media</h2>
        </div>
        <p className="text-slate-400 font-medium text-lg">Personaliza la identidad visual de tus protocolos cargando imágenes específicas.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12">
        <div className="space-y-8 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm self-start">
           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Nueva Carga de Medios</h3>
           <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nombre del Ejercicio</label>
                <input 
                  type="text" 
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="EJ. PRESS BANCA"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest focus:border-indigo-600 outline-none transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Archivo Visual</label>
                <div className="relative group">
                  <input 
                    id="file-upload"
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all">
                     <Upload className={`w-8 h-8 ${file ? 'text-green-500' : 'text-slate-300'}`} />
                     <span className="text-xs font-bold text-slate-400 truncate max-w-full italic px-4 text-center">
                        {file ? file.name : 'Arrastra o selecciona imagen'}
                     </span>
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                disabled={uploading || !file || !exerciseName.trim()}
                className="w-full py-6 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 disabled:opacity-30 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
              >
                {uploading ? (
                  <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-yellow-400" />
                    Fijar Identidad
                  </>
                )}
              </button>
           </form>
        </div>

        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Activos Desplegados ({mediaItems.length})</h3>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {mediaItems.map((item) => (
                <motion.div 
                  layout
                  key={item.id}
                  className="group relative h-64 rounded-[32px] overflow-hidden bg-slate-100 border border-slate-100 shadow-md cursor-zoom-in"
                  onClick={() => onImageClick(item.imageUrl)}
                >
                  <img src={item.imageUrl} alt={item.exerciseName} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 via-indigo-900/20 to-transparent p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-all opacity-0 group-hover:opacity-100">
                     <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                           <span className="text-xs font-black text-indigo-300 uppercase tracking-widest block mb-1">Entidad:</span>
                           <h4 className="text-xl font-black text-white uppercase truncate">{item.exerciseName}</h4>
                        </div>
                        <button 
                          onClick={() => deleteMedia(item.id)}
                          className="p-4 bg-white/10 hover:bg-red-500 text-white rounded-2xl backdrop-blur-md transition-all"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                     </div>
                  </div>
                </motion.div>
              ))}
              
              {mediaItems.length === 0 && (
                <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[40px] text-slate-300">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronización de Medios Pendiente</span>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function RoutineView({ routine, user, customMedia, onImageClick }: { routine: Routine, user: User, customMedia: Record<string, string>, onImageClick: (url: string) => void }) {
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const translateDay = (name: string) => {
    const map: Record<string, string> = {
      'Monday': 'Lunes',
      'Tuesday': 'Martes',
      'Wednesday': 'Miércoles',
      'Thursday': 'Jueves',
      'Friday': 'Viernes',
      'Saturday': 'Sábado',
      'Sunday': 'Domingo'
    };
    return map[name] || name;
  };

  useEffect(() => {
    const q = query(
      collection(db, 'routines', routine.id, 'days'),
      orderBy('order', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Day));
      setDays(docs);
      if (docs.length > 0 && !selectedDayId) setSelectedDayId(docs[0].id);
    });
  }, [routine.id]);

  const activeDay = days.find(d => d.id === selectedDayId);

  return (
    <div className="h-full flex flex-col p-4 md:p-12 max-w-6xl mx-auto space-y-6 md:space-y-12">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-lg bg-green-100 text-green-600 text-[10px] font-black uppercase tracking-widest">Estado Activo</span>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Ref: {routine.id.slice(0, 8)}</span>
          </div>
          <h2 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">{routine.name}</h2>
          <div className="flex items-center gap-8 pt-2 md:pt-4">
            <div className="flex items-center gap-3 text-slate-400">
              <Calendar className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Sem {routine.weekStart}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2">
           <div className="bg-white p-4 md:p-6 rounded-3xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4 md:gap-6 w-full sm:w-auto">
              <div className="text-right flex-1 sm:flex-none">
                <div className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Carga Semanal</div>
                <div className="text-xl md:text-2xl font-black text-slate-800 leading-none">OPTIMIZADO</div>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 border-4 border-white rounded-2xl md:rounded-[20px] shadow-sm flex items-center justify-center -rotate-6">
                 <Dumbbell className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 rotate-6" />
              </div>
           </div>
        </div>
      </header>

      {/* Days Tabs */}
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => setSelectedDayId(day.id)}
            className={`whitespace-nowrap px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${
              selectedDayId === day.id
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105'
                : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50 shadow-sm'
            }`}
          >
            {translateDay(day.name)}
          </button>
        ))}
      </div>

      {/* Exercises Section */}
      <div className="flex-1 min-h-0 pb-12">
        <motion.div 
          key={selectedDayId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl md:rounded-[48px] shadow-md border border-slate-100 flex flex-col h-full overflow-hidden"
        >
          {activeDay ? (
            <ExerciseManager 
              routineId={routine.id} 
              dayId={activeDay.id} 
              userId={user.uid} 
              customMedia={customMedia}
              onImageClick={onImageClick}
            />
          ) : (
            <div className="p-12 md:p-24 text-center text-slate-200 font-black text-2xl md:text-4xl uppercase tracking-tighter">Datos Fuera de Línea</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function ExerciseManager({ routineId, dayId, userId, customMedia, onImageClick }: { routineId: string, dayId: string, userId: string, customMedia: Record<string, string>, onImageClick: (url: string) => void }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState({ name: '', reps: 10, sets: 3, weight: 20 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'routines', routineId, 'days', dayId, 'exercises'),
      orderBy('order', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));
      setExercises(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `routines/${routineId}/days/${dayId}/exercises`);
    });
  }, [routineId, dayId]);

  const handleAddExercise = async () => {
    if (!newExercise.name.trim()) return;
    const imageUrl = getExerciseImage(newExercise.name, customMedia);
    try {
      await addDoc(collection(db, 'routines', routineId, 'days', dayId, 'exercises'), {
        routineId,
        dayId,
        userId,
        name: newExercise.name.toUpperCase(),
        reps: Number(newExercise.reps),
        sets: Number(newExercise.sets),
        weight: Number(newExercise.weight),
        imageUrl,
        order: exercises.length,
        createdAt: serverTimestamp(),
      });
      setNewExercise({ name: '', reps: 10, sets: 3, weight: 20 });
      setShowAddForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `routines/${routineId}/days/${dayId}/exercises`);
    }
  };

  const deleteExercise = async (id: string) => {
    if (deletingId === id) return;
    
    console.log('[DEBUG] Eliminación confirmada para:', id);
    setDeletingId(id);
    try {
      const docRef = doc(db, 'routines', routineId, 'days', dayId, 'exercises', id);
      await deleteDoc(docRef);
      console.log('[DEBUG] Borrado Firestore completado con éxito');
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('[DEBUG] Error crítico al borrar ejercicio:', error);
      handleFirestoreError(error, OperationType.DELETE, `routines/${routineId}/days/${dayId}/exercises/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
            <Dumbbell className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-base md:text-lg text-slate-800 leading-none mb-1">Matriz de Protocolo</h4>
            <p className="text-[9px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{exercises.length} Unidades Activas</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
          Registrar Unidad
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 no-scrollbar">
        <div className="hidden md:grid grid-cols-[60px_100px_1fr_120px_120px_100px] px-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">
          <span>ORDEN</span>
          <span>VISUAL</span>
          <span className="px-6">EJERCICIO / PROTOCOLO</span>
          <span className="text-center">SERIES x REPS</span>
          <span className="text-center">CARGA</span>
          <span className="text-right">GESTIONAR</span>
        </div>
        <AnimatePresence initial={false}>
          {exercises.map((ex, idx) => (
            <motion.div 
              key={ex.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="group flex flex-col md:grid md:grid-cols-[60px_100px_1fr_120px_120px_100px] md:items-center p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all mb-4 relative gap-4 md:gap-0"
            >
              <div className="flex items-center justify-between md:block">
                <span className="text-xs md:text-sm font-black text-slate-300 md:text-slate-200">{String(idx + 1).padStart(2, '0')}</span>
                <div className="md:hidden flex gap-2">
                   <button 
                    onClick={() => {
                        if (confirmDeleteId === ex.id) {
                          deleteExercise(ex.id);
                        } else {
                          setConfirmDeleteId(ex.id);
                          setTimeout(() => setConfirmDeleteId(null), 3000);
                        }
                    }}
                    className={`p-2 rounded-lg ${confirmDeleteId === ex.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-500'}`}
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="flex items-center gap-4 md:contents">
                <div 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-white overflow-hidden shadow-sm flex items-center justify-center p-0 border border-slate-100 shrink-0 cursor-zoom-in"
                  onClick={() => onImageClick(getExerciseImage(ex.name, customMedia, ex.imageUrl))}
                >
                    <img src={getExerciseImage(ex.name, customMedia, ex.imageUrl)} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                
                <div className="md:px-6 flex-1 min-w-0">
                  <span className="font-black tracking-tight text-lg md:text-xl uppercase truncate block text-slate-900">{ex.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest truncate">Unidad Sincronizada</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:contents">
                  <div className="flex flex-col items-center justify-center p-3 md:p-4 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Volumen</span>
                    <span className="text-base md:text-lg font-black text-indigo-600">{ex.sets} x {ex.reps}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 md:p-4 bg-indigo-600 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-100 md:ml-4">
                    <span className="text-[8px] md:text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 leading-none">Carga</span>
                    <span className="text-base md:text-lg font-black text-white">{ex.weight} KG</span>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex justify-end relative z-[10] pointer-events-auto">
                <button 
                  type="button"
                  disabled={deletingId === ex.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (confirmDeleteId === ex.id) {
                      deleteExercise(ex.id);
                    } else {
                      setConfirmDeleteId(ex.id);
                      setTimeout(() => setConfirmDeleteId(null), 3000);
                    }
                  }}
                  className={`min-w-[4rem] h-16 px-4 rounded-[24px] shadow-lg transition-all active:scale-75 flex items-center justify-center cursor-pointer border-2 shadow-red-100/50 group/del ${
                    deletingId === ex.id 
                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-50' 
                      : confirmDeleteId === ex.id
                        ? 'bg-red-600 border-red-700 text-white w-32'
                        : 'bg-white border-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-600 w-16'
                  }`}
                >
                  {deletingId === ex.id ? (
                    <div className="w-6 h-6 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  ) : confirmDeleteId === ex.id ? (
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">¿SI?</span>
                  ) : (
                    <Trash2 className="w-8 h-8" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {exercises.length === 0 && !showAddForm && (
          <div className="py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl md:rounded-[40px] border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mb-6 text-slate-100">
              <PlusCircle className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <span className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-widest">Matriz Vacía • Sin Datos</span>
          </div>
        )}

        <AnimatePresence>
          {showAddForm && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 md:p-10 rounded-3xl md:rounded-[40px] bg-indigo-900 text-white space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 md:gap-6">
                <div className="space-y-2 md:space-y-3 sm:col-span-2 md:col-span-1">
                  <label className="text-[9px] md:text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Designación</label>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="EJ. PRESS BANCA"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({...newExercise, name: e.target.value.toUpperCase()})}
                    className="w-full bg-indigo-800 border-2 border-indigo-700 p-4 md:p-5 rounded-xl md:rounded-2xl text-white font-black uppercase tracking-widest focus:border-yellow-400 outline-none placeholder:text-indigo-400/50 text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[9px] md:text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Series</label>
                  <input 
                    type="number" 
                    value={newExercise.sets}
                    onChange={(e) => setNewExercise({...newExercise, sets: Number(e.target.value)})}
                    className="w-full bg-indigo-800 border-2 border-indigo-700 p-4 md:p-5 rounded-xl md:rounded-2xl text-white font-black tracking-widest focus:border-yellow-400 outline-none text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[9px] md:text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Reps</label>
                  <input 
                    type="number" 
                    value={newExercise.reps}
                    onChange={(e) => setNewExercise({...newExercise, reps: Number(e.target.value)})}
                    className="w-full bg-indigo-800 border-2 border-indigo-700 p-4 md:p-5 rounded-xl md:rounded-2xl text-white font-black tracking-widest focus:border-yellow-400 outline-none text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[9px] md:text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Peso (KG)</label>
                  <input 
                    type="number" 
                    value={newExercise.weight}
                    onChange={(e) => setNewExercise({...newExercise, weight: Number(e.target.value)})}
                    className="w-full bg-indigo-800 border-2 border-indigo-700 p-4 md:p-5 rounded-xl md:rounded-2xl text-white font-black tracking-widest focus:border-yellow-400 outline-none text-sm md:text-base"
                  />
                </div>
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={handleAddExercise}
                  className="flex-1 py-4 md:py-6 bg-yellow-400 text-indigo-900 font-black uppercase tracking-[0.2em] rounded-xl md:rounded-2xl hover:bg-white transition-all shadow-xl shadow-yellow-900/20 active:scale-95 text-xs md:text-sm"
                >
                  Registrar Unidad
                </button>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="px-6 md:px-8 py-4 md:py-6 bg-indigo-800 text-white font-bold uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-indigo-700 transition-all border border-indigo-700 text-xs md:text-sm"
                >
                  Cancelar
                </button>
              </div>
              {/* Deco */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
