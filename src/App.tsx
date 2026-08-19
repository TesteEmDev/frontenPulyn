import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { usePulynStore } from './store/mockData';
import { useAuth } from './hooks/useAuth';
import { useEventControl } from './hooks/useEventControl';
import { EventoProvider } from './contexts/EventoContext';

import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/login/LoginPage';
import NotFound from './pages/NotFound';
import DisplayMain from './pages/display/DisplayMain';
import DisplayRanking from './pages/display/DisplayRanking';
import DisplayMap from './pages/display/DisplayMap';
import DisplayStandby from './pages/display/DisplayStandby';
import ReceptionDashboard from './pages/reception/ReceptionDashboard';
import ReceptionCheckin from './pages/reception/ReceptionCheckin';
import ReceptionKiosk from './pages/reception/ReceptionKiosk';
import ScoreKiosk from './pages/score-kiosk/ScoreKiosk';
import ReceptionParticipants from './pages/reception/ReceptionParticipants';
import ReceptionBracelets from './pages/reception/ReceptionBracelets';
import ReceptionFamilies from './pages/reception/ReceptionFamilies';
import GameMasterDashboard from './pages/game-master/GameMasterDashboard';
import GameMasterTeams from './pages/game-master/GameMasterTeams';
import GameMasterCheckpoints from './pages/game-master/GameMasterCheckpoints';
import GameMasterMessages from './pages/game-master/GameMasterMessages';
import GameMasterRanking from './pages/game-master/GameMasterRanking';
import GameMasterZoneSetup from './pages/game-master/GameMasterZoneSetup';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventNew from './pages/admin/AdminEventNew';
import AdminChildren from './pages/admin/AdminChildren';
import AdminChildProfile from './pages/admin/AdminChildProfile';
import AdminGames from './pages/admin/AdminGames';
import AdminGameForm from './pages/admin/AdminGameForm';
import AdminCheckpoints from './pages/admin/AdminCheckpoints';
import AdminCheckpointConfig from './pages/admin/AdminCheckpointConfig';
import AdminMap from './pages/admin/AdminMap';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTeams from './pages/admin/AdminTeams';
import AdminReports from './pages/admin/AdminReports';
import AdminSync from './pages/admin/AdminSync';
import AdminSettings from './pages/admin/AdminSettings';
import MasterDashboard from './pages/master/MasterDashboard';
import MasterClients from './pages/master/MasterClients';
import MasterPlans from './pages/master/MasterPlans';
import MasterMonitoring from './pages/master/MasterMonitoring';
import MasterLogs from './pages/master/MasterLogs';
import MasterSupport from './pages/master/MasterSupport';
import MasterAnalytics from './pages/master/MasterAnalytics';
import FamilyHome from './pages/family/FamilyHome';
import FamilyLocation from './pages/family/FamilyLocation';
import FamilyScores from './pages/family/FamilyScores';
import FamilyAchievements from './pages/family/FamilyAchievements';
import FamilyQuiz from './pages/family/FamilyQuiz';
import FamilyProfile from './pages/family/FamilyProfile';
import FamilyNotifications from './pages/family/FamilyNotifications';
import FamilyInviteRegister from './pages/family/FamilyInviteRegister';

function EventControlBridge({ enabled }: { enabled: boolean }) {
  const setEventoAtual = usePulynStore(state => state.setEventoAtual);
  useEventControl((eventId) => setEventoAtual(eventId), enabled);
  return null;
}

function App() {
  const { 
    syncAll, 
    loadTeams, 
    loadChildren, 
    loadCheckpoints, 
    loadReadings,
    loadEventos,
    loadBrincadeiras,
    loadClientes,
    eventoAtualId
  } = usePulynStore();
  
  const { isAuthenticated, user } = useAuth();

  // Restaurar sessão ao iniciar a app
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && !isAuthenticated) {
      // Token existe mas não está no state - pode ser um reload
      // O useAuth já tenta recuperar, então apenas continua
    }
  }, []);

  // Carregar dados gerais quando autenticado (não depende de evento)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Clientes são dados administrativos e a API permite acesso somente ao master.
    if (user.role === 'master') {
      loadClientes().catch(err => console.error('❌ Erro ao carregar clientes:', err));
    }
    // A área familiar usa somente os endpoints de vínculos aprovados.
    // O kiosk possui uma API dedicada e não deve carregar dados administrativos.
    if (user.role !== 'family' && user.role !== 'kiosk' && user.role !== 'score_kiosk') {
      loadBrincadeiras().catch(err => console.error('❌ Erro ao carregar jogos:', err));
      loadEventos().catch(err => console.error('❌ Erro ao carregar eventos:', err));
    }
  }, [isAuthenticated, user]);

  // Sincronizar com a API quando um evento está selecionado
  useEffect(() => {
    if (!eventoAtualId || user?.role === 'kiosk' || user?.role === 'score_kiosk') {
      return; // Não sincroniza sem evento ou no visor de autoatendimento
    }
    
    // Sincronizar dados específicos do evento
    const syncEventData = async () => {
      try {
        await syncAll();
      } catch (error) {
        console.error('❌ Erro ao sincronizar:', error);
      }
    };
    
    syncEventData();
    
    // Polling a cada 10 segundos (apenas se houver evento)
    const interval = setInterval(() => {
      loadTeams();
      loadChildren();
      loadCheckpoints();
      loadReadings();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [eventoAtualId, user?.role]);

  return (
    <BrowserRouter>
      <EventoProvider>
        <EventControlBridge enabled={isAuthenticated && Boolean(user?.empresa_id)} />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#132338',
              color: '#FFFFFF',
              border: '1px solid #1E3A54',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#4CAF50', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#E53935', secondary: '#FFFFFF' } },
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Telão */}
          <Route path="/display" element={<ProtectedRoute allowedRoles={['display']}><DisplayMain /></ProtectedRoute>} />
          <Route path="/display/ranking" element={<ProtectedRoute allowedRoles={['display']}><DisplayRanking /></ProtectedRoute>} />
          <Route path="/display/map" element={<ProtectedRoute allowedRoles={['display']}><DisplayMap /></ProtectedRoute>} />
          <Route path="/display/standby" element={<ProtectedRoute allowedRoles={['display']}><DisplayStandby /></ProtectedRoute>} />

          {/* Recepção */}
          <Route path="/reception" element={<ProtectedRoute allowedRoles={['reception']}><ReceptionDashboard /></ProtectedRoute>} />
          <Route path="/reception/checkin" element={<ProtectedRoute allowedRoles={['reception']}><ReceptionCheckin /></ProtectedRoute>} />
          <Route path="/reception/kiosk" element={<ProtectedRoute allowedRoles={['kiosk']}><ReceptionKiosk /></ProtectedRoute>} />
          <Route path="/score-kiosk" element={<ProtectedRoute allowedRoles={['kiosk', 'score_kiosk']}><ScoreKiosk /></ProtectedRoute>} />
          <Route path="/reception/participants" element={<ProtectedRoute allowedRoles={['reception']}><ReceptionParticipants /></ProtectedRoute>} />
          <Route path="/reception/bracelets" element={<ProtectedRoute allowedRoles={['reception']}><ReceptionBracelets /></ProtectedRoute>} />
          <Route path="/reception/families" element={<ProtectedRoute allowedRoles={['reception']}><ReceptionFamilies /></ProtectedRoute>} />

          {/* Recreacionista */}
          <Route path="/game-master" element={<ProtectedRoute allowedRoles={['game_master']}><GameMasterDashboard /></ProtectedRoute>} />
          <Route path="/game-master/teams" element={<ProtectedRoute allowedRoles={['game_master']}><GameMasterTeams /></ProtectedRoute>} />
          <Route path="/game-master/checkpoints" element={<ProtectedRoute allowedRoles={['game_master']}><GameMasterCheckpoints /></ProtectedRoute>} />
          // Compatibilidade com links antigos.
  <Route path="/game-master/dashboard" element={<ProtectedRoute allowedRoles={['game_master']}><GameMasterDashboard /></ProtectedRoute>} />
  <Route path="/game-master/control" element={<ProtectedRoute allowedRoles={['game_master']}><GameMasterDashboard /></ProtectedRoute>} />
          <Route path="/game-master/messages" element={<ProtectedRoute allowedRoles={['game_master']}><GameMasterMessages /></ProtectedRoute>} />
          <Route path="/game-master/ranking" element={<ProtectedRoute allowedRoles={['game_master']}><GameMasterRanking /></ProtectedRoute>} />
          <Route path="/game-master/zone-setup" element={<ProtectedRoute allowedRoles={['game_master']}><GameMasterZoneSetup /></ProtectedRoute>} />

          {/* Admin do Buffet */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allowedRoles={['admin']}><AdminEvents /></ProtectedRoute>} />
          <Route path="/admin/events/new" element={<ProtectedRoute allowedRoles={['admin']}><AdminEventNew /></ProtectedRoute>} />
          <Route path="/admin/events/:id/edit" element={<ProtectedRoute allowedRoles={['admin']}><AdminEventNew /></ProtectedRoute>} />
          <Route path="/admin/children" element={<ProtectedRoute allowedRoles={['admin']}><AdminChildren /></ProtectedRoute>} />
          <Route path="/admin/children/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminChildProfile /></ProtectedRoute>} />
          <Route path="/admin/games" element={<ProtectedRoute allowedRoles={['admin']}><AdminGames /></ProtectedRoute>} />
          <Route path="/admin/games/new" element={<ProtectedRoute allowedRoles={['admin']}><AdminGameForm /></ProtectedRoute>} />
          <Route path="/admin/games/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminGameForm /></ProtectedRoute>} />
          <Route path="/admin/checkpoints" element={<ProtectedRoute allowedRoles={['admin']}><AdminCheckpoints /></ProtectedRoute>} />
          <Route path="/admin/checkpoints/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminCheckpointConfig /></ProtectedRoute>} />
          <Route path="/admin/map" element={<ProtectedRoute allowedRoles={['admin']}><AdminMap /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/teams" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeams /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/sync" element={<ProtectedRoute allowedRoles={['admin']}><AdminSync /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

          {/* Painel Master Pulyn */}
          <Route path="/master" element={<ProtectedRoute allowedRoles={['master']}><MasterDashboard /></ProtectedRoute>} />
          <Route path="/master/clients" element={<ProtectedRoute allowedRoles={['master']}><MasterClients /></ProtectedRoute>} />
          <Route path="/master/plans" element={<ProtectedRoute allowedRoles={['master']}><MasterPlans /></ProtectedRoute>} />
          <Route path="/master/monitoring" element={<ProtectedRoute allowedRoles={['master']}><MasterMonitoring /></ProtectedRoute>} />
          <Route path="/master/logs" element={<ProtectedRoute allowedRoles={['master']}><MasterLogs /></ProtectedRoute>} />
          <Route path="/master/support" element={<ProtectedRoute allowedRoles={['master']}><MasterSupport /></ProtectedRoute>} />
          <Route path="/master/analytics" element={<ProtectedRoute allowedRoles={['master']}><MasterAnalytics /></ProtectedRoute>} />

          {/* App Família */}
          <Route path="/family/invite/:token" element={<FamilyInviteRegister />} />
          <Route path="/family" element={<ProtectedRoute allowedRoles={['family']}><FamilyHome /></ProtectedRoute>} />
          <Route path="/family/location" element={<ProtectedRoute allowedRoles={['family']}><FamilyLocation /></ProtectedRoute>} />
          <Route path="/family/scores" element={<ProtectedRoute allowedRoles={['family']}><FamilyScores /></ProtectedRoute>} />
          <Route path="/family/achievements" element={<ProtectedRoute allowedRoles={['family']}><FamilyAchievements /></ProtectedRoute>} />
          <Route path="/family/quiz" element={<ProtectedRoute allowedRoles={['family']}><FamilyQuiz /></ProtectedRoute>} />
          <Route path="/family/profile" element={<ProtectedRoute allowedRoles={['family']}><FamilyProfile /></ProtectedRoute>} />
          <Route path="/family/notifications" element={<ProtectedRoute allowedRoles={['family']}><FamilyNotifications /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </EventoProvider>
    </BrowserRouter>
  );
}

export default App;