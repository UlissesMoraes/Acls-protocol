// Ícones do app (lucide-react) — set vetorial consistente no lugar de emojis.
import {
  Activity, Heart, HeartPulse, Flame, Skull, Bug, Droplet, Droplets,
  Brain, Zap, Wind, FlaskConical, Syringe,
  Search, Siren, Wrench, Moon, Sun, Download, Scale, ArrowLeft,
  ListChecks, Pill, BarChart3, Star, ChevronDown, Clock, X, TriangleAlert,
  Stethoscope, Smartphone, LayoutGrid, Split, SlidersHorizontal, ChevronRight, ShieldCheck, Sparkles, Baby, Box,
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
  Protocols: LayoutGrid, Decision: Split, Filter: SlidersHorizontal, ChevronRight, Shield: ShieldCheck, Sparkles, Baby,
};

// Metadados de cada ferramenta para o catálogo (ícone + nome curto)
export const TOOL_META = {
  code:      { Ic: Siren,        short: "Copiloto de RCP" },
  assistant: { Ic: Sparkles,     short: "Copiloto Clínico" },
  procedures:{ Ic: Box,          short: "Procedimentos 3D" },
  pedweight: { Ic: Baby,         short: "Peso por idade" },
  infusion:  { Ic: Syringe,      short: "Bomba de Infusão" },
  grace:     { Ic: Heart,        short: "GRACE" },
  chadsvasc: { Ic: HeartPulse,   short: "CHA₂DS₂-VASc" },
  hasbled:   { Ic: Droplet,      short: "HAS-BLED" },
  heart:     { Ic: Heart,        short: "HEART" },
  qtc:       { Ic: Activity,     short: "QTc" },
  nihss:     { Ic: Brain,        short: "NIHSS" },
  gcs:       { Ic: Brain,        short: "Glasgow" },
  qsofa:     { Ic: Activity,     short: "qSOFA" },
  sofa:      { Ic: Activity,     short: "SOFA" },
  clcr:      { Ic: FlaskConical, short: "ClCr" },
  wells:     { Ic: Wind,         short: "Wells (TEP)" },
  osm:       { Ic: Droplet,      short: "Osmolaridade" },
  nacorr:    { Ic: FlaskConical, short: "Na⁺ corrigido" },
  cacorr:    { Ic: FlaskConical, short: "Ca²⁺ corrigido" },
  aniongap:  { Ic: FlaskConical, short: "Ânion Gap" },
  h2odef:    { Ic: Droplet,      short: "Déficit de água" },
  kdef:      { Ic: FlaskConical, short: "Déficit de K⁺" },
};
