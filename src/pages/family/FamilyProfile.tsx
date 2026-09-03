import { useState } from 'react';
import { useFamilyData } from '../../hooks/useFamilyData';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import { Home, MapPin, Trophy, Star, Gamepad2, User, Shield, Lock, LogOut, CreditCard as Edit3, Phone, Mail } from 'lucide-react';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

export default function FamilyProfile() {
  const { children } = useFamilyData();
  const { user, logout } = useAuth();
  const [editChildModal, setEditChildModal] = useState<string | null>(null);
  const [logoutModal, setLogoutModal] = useState(false);

  const familyChildren = children.filter((c) => c.status === 'active');

  const editingChild = children.find((c) => c.id === editChildModal);
  const editingTeam = editingChild?.time_id
    ? { id: editingChild.time_id, name: editingChild.time_name, color: editingChild.time_color || '#1E9BD7', icon: '👥' }
    : null;



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
                {user?.name || 'Responsável'}
              </p>
            </div>
          </div>
          <div className="space-y-2 ml-11">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Phone size={14} />
              <span>Telefone não informado</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Mail size={14} />
              <span>{user?.email || 'E-mail não informado'}</span>
            </div>
          </div>
        </Card>

        {/* Children */}
        <h3 className="text-white font-display font-semibold text-lg mb-3">
          Crianças
        </h3>
        <div className="space-y-2 mb-6">
          {familyChildren.map((child) => {
            const team = child.time_id ? { id: child.time_id, name: child.time_name, color: child.time_color || '#1E9BD7', icon: '👥' } : null;
            return (
              <Card
                key={child.id}
                className="flex items-center gap-3"
                onClick={() => setEditChildModal(child.id)}
              >
                <Avatar
                  emoji={child.avatar || '👤'}
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

        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={18} className="text-primary" />
            <h3 className="text-white font-display font-semibold">Privacidade e permissões</h3>
          </div>
          <p className="text-sm text-gray-400">
            As preferências de privacidade serão exibidas quando forem configuradas para esta conta.
          </p>
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
                emoji={editingChild.avatar || '👤'}
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
                {editingChild.bracelet_code || 'Nenhuma'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-gray-400">Pontuação</span>
              <span className="text-sm text-white font-mono font-bold">
                {Number(editingChild.scores || 0)} pts
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
              onClick={() => { setLogoutModal(false); logout(); }}
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
