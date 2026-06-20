// Ícones do app (lucide-react) — set vetorial consistente no lugar de emojis.
import {
  Activity, Heart, HeartPulse, Flame, Skull, Bug, Droplet, Droplets,
  Brain, Zap, Wind, FlaskConical, Syringe,
  Search, Siren, Wrench, Moon, Sun, Download, Scale, ArrowLeft,
  ListChecks, Pill, BarChart3, Star, ChevronDown, Clock, X, TriangleAlert,
  Stethoscope, Smartphone, LayoutGrid, Split,
} from "lucide-react";

// Protocolo (por id) → ícone. Fallback: estetoscópio.
const PROTO = {
  taquiarritmias: Activity,
  bradiarritmias: Heart,
  pcr: HeartPulse,
  iamcssst: Flame,
  iamssst: Heart,
  intoxicacoes: Skull,
  sepse: Bug,
  cad: Droplet,
  hhns: Droplets,
  avc: Brain,
  convulsoes: Zap,
  amax4: Wind,
  hidroeletroliticos: FlaskConical,
  vasoativas: Syringe,
};

export function ProtoIcon({ id, size = 26, color, strokeWidth = 1.9, style }) {
  const Cmp = PROTO[id] || Stethoscope;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={style} aria-hidden="true" />;
}

// Ícones de interface reexportados com nomes semânticos.
export const Icons = {
  Search, Siren, Wrench, Moon, Sun, Download, Scale, ArrowLeft,
  Cascade: ListChecks, Drug: Pill, Antidote: FlaskConical, Score: BarChart3,
  Star, ChevronDown, Clock, X, Alert: TriangleAlert, Install: Smartphone,
  Protocols: LayoutGrid, Decision: Split,
};
