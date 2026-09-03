import { useNavigate } from 'react-router-dom';

interface PulynLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  clickable?: boolean;
  className?: string;
}

const sizes = {
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16',
  xl: 'h-24',
};

export default function PulynLogo({ size = 'md', clickable = true, className = '' }: PulynLogoProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (clickable) {
      navigate(-1);
    }
  };

  return (
    <img
      src="/logo-pulyn.png"
      alt="Pulyn"
      className={`
        ${sizes[size]}
        w-auto object-contain
        ${clickable ? 'cursor-pointer transition-transform hover:scale-105 active:scale-95' : ''}
        ${className}
      `}
      onClick={handleClick}
      title={clickable ? 'Voltar' : 'Pulyn'}
    />
  );
}
