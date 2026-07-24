import { useState } from 'react';
import { usePulynStore } from '../../store/mockData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import { Home, MapPin, Trophy, Star, Gamepad2, User, Users, Shield, Lock, LogOut, ChevronRight, CreditCard as Edit3, CheckCircle, XCircle, Phone, Mail } from 'lucide-react';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

interface Guardian {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'main' | 'other';
}

const guardians: Guardian[] = [
  {
    id: 'g1',
    name: 'Carlos Silva',
    phone: '(11) 99999-0001',
    email: 'carlos@email.com',
    role: 'main',
  },
  {
    id: 'g2',
    name: 'Ana Silva',
    phone: '(11) 99999-0002',
    email: 'ana@email.com',
    role: 'other',
  },
];

interface ConsentItem {
  id: string;
  label: string;
  granted: boolean;
  date: string;
}

const consents: ConsentItem[] = [
  { id: 'c1', label: 'Coleta de dados de localização', granted: true, date: '15/05/2026' },
  { id: 'c2', label: 'Uso de imagem para marketing', granted: false, date: '-' },
  { id: 'c3', label: 'Compartilhamento com parceiros', granted: false, date: '-' },
  { id: 'c4', label: 'Notificações por push', granted: true, date: '15/05/2026' },
];

interface PermissionItem {
  id: string;
  label: string;
  enabled: boolean;
}

const permissions: PermissionItem[] = [
  { id: 'p1', label: 'Localização em tempo real', enabled: true },
  { id: 'p2', label: 'Notificações de segurança', enabled: true },
  { id: 'p3', label: 'Alertas de pontuação', enabled: true },
  { id: 'p4', label: 'Convites de eventos', enabled: false },
];

export default function FamilyProfile() {
  const { children, teams } = usePulynStore();
  const [editChildModal, setEditChildModal] = useState<string | null>(null);
  const [logoutModal, setLogoutModal] = useState(false);

  const familyChildren = children.filter((c) =>
    ['1', '3', '9'].includes(c.id)
  );

  const editingChild = children.find((c) => c.id === editChildModal);
  const editingTeam = editingChild
    ? teams.find((t) => t.id === editingChild.team)
    : null;

  const grantedConsents = consents.filter((c) => c.granted).length;

  return (
    <div className="min-h-screen bg-dark pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <PageHeader
          title="Perfil"
          description="Dados da família"
          icon={<User size={24} />}
        />

        {/* Main Guardian */}
        <Card variant="glow" className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-primary/20">
              <Shield size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-body">Responsável principal</p>
              <p className="text-white font-display font-semibold">
                {guardians.find((g) => g.role === 'main')?.name}
              </p>
            </div>
          </div>
          <div className="space-y-2 ml-11">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Phone size={14} />
              <span>{guardians.find((g) => g.role === 'main')?.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Mail size={14} />
              <span>{guardians.find((g) => g.role === 'main')?.email}</span>
            </div>
          </div>
        </Card>

        {/* Other Guardians */}
        <h3 className="text-white font-display font-semibold text-lg mb-3">
          Outros responsáveis
        </h3>
        <div className="space-y-2 mb-6">
          {guardians
            .filter((g) => g.role === 'other')
            .map((g) => (
              <Card key={g.id} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface">
                  <Users size={18} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-body font-semibold truncate">
                    {g.name}
                  </p>
                  <p className="text-xs text-gray-400">{g.phone}</p>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </Card>
            ))}
        </div>

        {/* Children */}
        <h3 className="text-white font-display font-semibold text-lg mb-3">
          Crianças
        </h3>
        <div className="space-y-2 mb-6">
          {familyChildren.map((child) => {
            const team = teams.find((t) => t.id === child.team);
            return (
              <Card
                key={child.id}
                className="flex items-center gap-3"
                onClick={() => setEditChildModal(child.id)}
              >
                <Avatar
                  emoji={child.avatar}
                  size="md"
                  bgColor={team ? `${team.color}30` : 'bg-primary/30'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-body font-semibold truncate">
                    {child.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="muted">{child.age} anos</Badge>
                    {team && (
                      <Badge variant="primary">
                        {team.icon} {team.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <Edit3 size={16} className="text-gray-500" />
              </Card>
            );
          })}
        </div>

        {/* LGPD Consent */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={18} className="text-primary" />
            <h3 className="text-white font-display font-semibold">
              Consentimentos LGPD
            </h3>
            <Badge variant={grantedConsents === consents.length ? 'success' : 'warning'}>
              {grantedConsents}/{consents.length}
            </Badge>
          </div>
          <div className="space-y-2.5">
            {consents.map((consent) => (
              <div
                key={consent.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <p className="text-sm text-gray-300 font-body pr-2">
                  {consent.label}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {consent.granted ? (
                    <CheckCircle size={18} className="text-success" />
                  ) : (
                    <XCircle size={18} className="text-gray-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Permissions */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-secondary" />
            <h3 className="text-white font-display font-semibold">
              Permissões
            </h3>
          </div>
          <div className="space-y-2.5">
            {permissions.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <p className="text-sm text-gray-300 font-body">{perm.label}</p>
                <div
                  className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
                    perm.enabled ? 'bg-primary' : 'bg-surface'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      perm.enabled ? 'left-5' : 'left-1'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Logout */}
        <Button
          variant="danger"
          onClick={() => setLogoutModal(true)}
          className="w-full mb-8"
        >
          <LogOut size={18} className="mr-2" />
          Sair da conta
        </Button>
      </div>

      {/* Edit Child Modal */}
      <Modal
        isOpen={!!editChildModal}
        onClose={() => setEditChildModal(null)}
        title={editingChild?.name || ''}
      >
        {editingChild && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar
                emoji={editingChild.avatar}
                size="lg"
                bgColor={editingTeam ? `${editingTeam.color}30` : 'bg-primary/30'}
              />
              <div>
                <p className="text-white font-display font-semibold">
                  {editingChild.nickname}
                </p>
                <p className="text-sm text-gray-400">{editingChild.age} anos</p>
                {editingTeam && (
                  <Badge variant="primary">
                    {editingTeam.icon} {editingTeam.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-gray-400">Pulseira</span>
              <span className="text-sm text-white font-mono">
                {editingChild.bracelet || 'Nenhuma'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-gray-400">Pontuação</span>
              <span className="text-sm text-white font-mono font-bold">
                {editingChild.score} pts
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-400">Status</span>
              <Badge
                variant={
                  editingChild.status === 'active' ? 'success' : 'warning'
                }
              >
                {editingChild.status === 'active' ? 'Ativo' : 'Pendente'}
              </Badge>
            </div>
            <Button
              variant="secondary"
              onClick={() => setEditChildModal(null)}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={logoutModal}
        onClose={() => setLogoutModal(false)}
        title="Sair da conta"
      >
        <div className="space-y-4">
          <p className="text-gray-300 font-body">
            Tem certeza que deseja sair? Você precisará fazer login novamente
            para acessar o aplicativo.
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setLogoutModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => setLogoutModal(false)}
              className="flex-1"
            >
              Sair
            </Button>
          </div>
        </div>
      </Modal>

      <BottomNav items={navItems} activePath="/family/profile" />
    </div>
  );
}
