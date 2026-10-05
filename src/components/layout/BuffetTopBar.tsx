import { type ComponentProps } from 'react';
import TopBar from './TopBar';
import { useBuffetName } from '../../hooks/useBuffetName';

type BuffetTopBarProps = Omit<ComponentProps<typeof TopBar>, 'title'>;

// Cabeçalho das telas do admin: o título é o nome do buffet da conta logada.
export default function BuffetTopBar(props: BuffetTopBarProps) {
  return <TopBar title={useBuffetName()} {...props} />;
}
