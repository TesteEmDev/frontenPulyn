import { useState } from 'react';
import { usePulynStore } from '../../store/mockData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import {
  Home,
  MapPin,
  Trophy,
  Star,
  Gamepad2,
  HelpCircle,
  CheckCircle,
  XCircle,
  Gift,
  ArrowLeft,
  Sparkles,
  Zap,
} from 'lucide-react';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  bonusPoints: number;
  questions: QuizQuestion[];
}

const quizzes: QuizData[] = [];

type QuizState = 'select' | 'playing' | 'feedback' | 'result';

export default function FamilyQuiz() {
  const { children } = usePulynStore();

  const [quizState, setQuizState] = useState<QuizState>('select');
  const [selectedQuiz, setSelectedQuiz] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [, setAnsweredQuestions] = useState(0);

  const activeChildren = children.filter((c) => c.status === 'active' && c.team);

  const handleStartQuiz = (quiz: QuizData) => {
    setSelectedQuiz(quiz);
    setCurrentQuestion(0);
    setScore(0);
    setAnsweredQuestions(0);
    setSelectedAnswer(null);
    setQuizState('playing');
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);

    const isCorrect =
      index === selectedQuiz!.questions[currentQuestion].correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + selectedQuiz!.bonusPoints);
    }
    setAnsweredQuestions((prev) => prev + 1);
    setQuizState('feedback');
  };

  const handleNextQuestion = () => {
    if (currentQuestion + 1 >= selectedQuiz!.questions.length) {
      setQuizState('result');
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setQuizState('playing');
    }
  };

  const handleBackToQuizzes = () => {
    setQuizState('select');
    setSelectedQuiz(null);
    setSelectedChild(null);
    setSelectedAnswer(null);
  };

  // Select quiz screen
  if (quizState === 'select') {
    return (
      <div className="min-h-screen bg-dark pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <PageHeader
            title="Quiz"
            description="Ganhe pontos extras respondendo!"
            icon={<HelpCircle size={24} />}
          />

          {/* Child selection */}
          <Card className="mb-4">
            <p className="text-sm text-gray-400 mb-3 font-body">
              Selecione a criança:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {activeChildren.slice(0, 6).map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border shrink-0 transition-colors ${
                    selectedChild === child.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <Avatar emoji={child.avatar} size="sm" />
                  <span className="text-[10px] text-gray-300 max-w-[56px] truncate">
                    {child.nickname}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Available quizzes */}
          <h3 className="text-white font-display font-semibold text-lg mb-3">
            Quizzes disponíveis
          </h3>
          {quizzes.length === 0 ? (
            <Card className="mb-6">
              <p className="text-sm text-gray-500 text-center">Nenhum quiz configurado para este evento.</p>
            </Card>
          ) : (
          <div className="space-y-3 mb-6">
            {quizzes.map((quiz) => (
              <Card
                key={quiz.id}
                variant="glow"
                onClick={
                  selectedChild ? () => handleStartQuiz(quiz) : undefined
                }
                className={`${
                  selectedChild ? 'cursor-pointer' : 'opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Sparkles size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-display font-semibold">
                      {quiz.title}
                    </h4>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {quiz.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="accent">
                        <Gift size={12} className="mr-1" />
                        +{quiz.bonusPoints} pts por acerto
                      </Badge>
                      <Badge variant="muted">
                        {quiz.questions.length} pergunta
                        {quiz.questions.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          )}

          {!selectedChild && (
            <p className="text-center text-sm text-accent font-body">
              Selecione uma criança para começar
            </p>
          )}
        </div>

        <BottomNav items={navItems} activePath="/family/achievements" />
      </div>
    );
  }

  // Playing / Feedback screen
  if (quizState === 'playing' || quizState === 'feedback') {
    const question = selectedQuiz!.questions[currentQuestion];
    const isCorrect = selectedAnswer === question.correctIndex;

    return (
      <div className="min-h-screen bg-dark pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBackToQuizzes}
              className="p-2 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-300" />
            </button>
            <div className="text-center">
              <p className="text-sm text-gray-400 font-body">{selectedQuiz!.title}</p>
              <p className="text-xs text-gray-500">
                Pergunta {currentQuestion + 1} de {selectedQuiz!.questions.length}
              </p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/20">
              <Zap size={14} className="text-accent" />
              <span className="font-mono font-bold text-accent text-sm">{score}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-surface overflow-hidden mb-6">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${((currentQuestion + (quizState === 'feedback' ? 1 : 0)) / selectedQuiz!.questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Question */}
          <Card variant="glow" className="mb-6">
            <h2 className="text-white font-display font-semibold text-lg text-center leading-snug">
              {question.text}
            </h2>
          </Card>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => {
              let buttonClass =
                'w-full text-left p-4 rounded-xl border-2 font-body font-semibold text-base transition-all ';

              if (quizState === 'feedback') {
                if (index === question.correctIndex) {
                  buttonClass +=
                    'border-success bg-success/15 text-success';
                } else if (
                  index === selectedAnswer &&
                  index !== question.correctIndex
                ) {
                  buttonClass +=
                    'border-danger bg-danger/15 text-danger';
                } else {
                  buttonClass += 'border-border bg-surface text-gray-500 opacity-50';
                }
              } else {
                buttonClass +=
                  'border-border bg-surface text-gray-200 hover:border-primary hover:bg-primary/10';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={quizState === 'feedback'}
                  className={buttonClass}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full border border-current flex items-center justify-center text-sm font-bold shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                    {quizState === 'feedback' &&
                      index === question.correctIndex && (
                        <CheckCircle
                          size={20}
                          className="text-success ml-auto shrink-0"
                        />
                      )}
                    {quizState === 'feedback' &&
                      index === selectedAnswer &&
                      index !== question.correctIndex && (
                        <XCircle
                          size={20}
                          className="text-danger ml-auto shrink-0"
                        />
                      )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback & Next */}
          {quizState === 'feedback' && (
            <Card
              className={`text-center ${
                isCorrect ? 'border-success/50' : 'border-danger/50'
              }`}
            >
              <div className="flex flex-col items-center gap-2 mb-4">
                {isCorrect ? (
                  <>
                    <CheckCircle size={40} className="text-success" />
                    <p className="text-success font-display font-semibold text-lg">
                      Resposta correta!
                    </p>
                    <p className="text-accent text-sm font-mono font-bold">
                      +{selectedQuiz!.bonusPoints} pontos
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle size={40} className="text-danger" />
                    <p className="text-danger font-display font-semibold text-lg">
                      Resposta errada
                    </p>
                    <p className="text-gray-400 text-sm">
                      A resposta correta era:{' '}
                      <span className="text-white font-semibold">
                        {question.options[question.correctIndex]}
                      </span>
                    </p>
                  </>
                )}
              </div>
              <Button
                variant={isCorrect ? 'primary' : 'secondary'}
                onClick={handleNextQuestion}
                className="w-full"
              >
                {currentQuestion + 1 >= selectedQuiz!.questions.length
                  ? 'Ver resultado'
                  : 'Próxima pergunta'}
              </Button>
            </Card>
          )}
        </div>

        <BottomNav items={navItems} activePath="/family/achievements" />
      </div>
    );
  }

  // Result screen
  if (quizState === 'result') {
    const totalPossible =
      selectedQuiz!.questions.length * selectedQuiz!.bonusPoints;
    const percentage = Math.round((score / totalPossible) * 100);
    const child = children.find((c) => c.id === selectedChild);

    return (
      <div className="min-h-screen bg-dark pb-24">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Trophy size={40} className="text-primary" />
            </div>

            <h1 className="text-white font-display font-bold text-2xl mb-2">
              Quiz finalizado!
            </h1>

            {child && (
              <div className="flex items-center gap-2 mb-4">
                <Avatar emoji={child.avatar} size="sm" />
                <span className="text-gray-300 font-body">{child.nickname}</span>
              </div>
            )}

            <Card variant="glow" className="w-full mb-6">
              <div className="flex items-center justify-center gap-6">
                <div>
                  <p className="text-4xl font-mono font-bold text-white">
                    {score}
                  </p>
                  <p className="text-sm text-gray-400">pontos ganhos</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-4xl font-mono font-bold text-secondary">
                    {percentage}%
                  </p>
                  <p className="text-sm text-gray-400">acertos</p>
                </div>
              </div>
            </Card>

            <div className="w-full space-y-3 mb-6">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-gray-400 text-sm">Quiz</span>
                <span className="text-white font-semibold text-sm">
                  {selectedQuiz!.title}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-gray-400 text-sm">Perguntas</span>
                <span className="text-white font-semibold text-sm">
                  {selectedQuiz!.questions.length}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-gray-400 text-sm">Pontos por acerto</span>
                <span className="text-white font-semibold text-sm">
                  {selectedQuiz!.bonusPoints}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-400 text-sm">Total possível</span>
                <span className="text-white font-semibold text-sm">
                  {totalPossible}
                </span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <Button
                variant="primary"
                onClick={handleBackToQuizzes}
                className="w-full"
              >
                Jogar novamente
              </Button>
              <Button
                variant="ghost"
                onClick={handleBackToQuizzes}
                className="w-full"
              >
                Voltar aos quizzes
              </Button>
            </div>
          </div>
        </div>

        <BottomNav items={navItems} activePath="/family/achievements" />
      </div>
    );
  }

  return null;
}
