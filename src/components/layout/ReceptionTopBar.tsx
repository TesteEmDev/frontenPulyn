import { type ComponentProps } from 'react';
import TopBar from './TopBar';

type ReceptionTopBarProps = Omit<ComponentProps<typeof TopBar>, 'title'>;

// Cabeçalho das telas da recepção: o título é sempre "Recepção" e cada tela informa só o subtítulo.
export default function ReceptionTopBar(props: ReceptionTopBarProps) {
  return <TopBar title="Recepção" {...props} />;
}
