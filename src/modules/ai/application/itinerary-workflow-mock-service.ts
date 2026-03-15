import type {
  AiItineraryGenerateRequest,
  AiLogicValidateRequest,
  AiLogicValidateResponse,
  AiToneTransformRequest
} from '../api/proposal-contracts';

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((chunk) => (chunk.length > 1 ? `${chunk[0].toUpperCase()}${chunk.slice(1).toLowerCase()}` : chunk.toUpperCase()))
    .join(' ')
    .trim();
}

function minutesFromTime(start: string): number {
  const [hours, minutes] = start.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function generateMockItineraryWorkflow(input: AiItineraryGenerateRequest) {
  const normalizedInterests = input.interests.map((interest) => interest.trim()).filter((interest) => interest.length > 0);
  const interests = normalizedInterests.length > 0 ? normalizedInterests : ['experiencias locales'];

  const days = Array.from({ length: input.durationDays }, (_, index) => {
    const dayIndex = index + 1;
    const firstInterest = interests[index % interests.length];
    const secondInterest = interests[(index + 1) % interests.length];

    return {
      dayIndex,
      title: `Día ${dayIndex} · ${titleCase(firstInterest)}`,
      summary: `Plan equilibrado en ${input.destination} con enfoque en ${firstInterest} y ${secondInterest}.`,
      activities: [
        {
          title: `${titleCase(firstInterest)} guiado`,
          category: 'activity',
          startsAtLocal: '09:00',
          durationMinutes: 180,
          notes: 'Bloque principal de experiencia.'
        },
        {
          title: `${titleCase(secondInterest)} + tiempo libre`,
          category: 'tour',
          startsAtLocal: '15:30',
          durationMinutes: 150,
          notes: 'Cierre con recomendaciones locales.'
        }
      ]
    };
  });

  return {
    schemaVersion: 'ai-itinerary.v1' as const,
    destination: input.destination,
    durationDays: input.durationDays,
    days
  };
}

export function transformMockItineraryTone(input: AiToneTransformRequest) {
  if (input.targetTone === 'luxury_inspiring') {
    return {
      transformedText: `Propuesta premium: ${input.sourceText.trim()} Enfatiza servicio personalizado, ritmo elegante y momentos memorables.`,
      targetTone: input.targetTone
    };
  }

  return {
    transformedText: `Plan operativo: ${input.sourceText.trim()} Prioriza claridad de tiempos, logística y siguientes pasos de confirmación.`,
    targetTone: input.targetTone
  };
}

export function validateMockItineraryLogic(input: AiLogicValidateRequest): AiLogicValidateResponse['data'] {
  const warnings: AiLogicValidateResponse['data']['warnings'] = [];
  const sortedByDayIndex = [...input.itinerary.days].sort((left, right) => left.dayIndex - right.dayIndex);

  sortedByDayIndex.forEach((day, dayPosition) => {
    if (day.dayIndex !== dayPosition + 1) {
      warnings.push({
        code: 'DAY_INDEX_NON_SEQUENTIAL',
        severity: 'medium',
        message: 'La secuencia de días no es consecutiva.',
        dayIndex: day.dayIndex
      });
    }

    const timedActivities = day.activities
      .filter((activity) => activity.startsAtLocal && activity.durationMinutes)
      .map((activity) => ({
        start: minutesFromTime(activity.startsAtLocal as string),
        end: minutesFromTime(activity.startsAtLocal as string) + (activity.durationMinutes as number),
        title: activity.title
      }))
      .sort((left, right) => left.start - right.start);

    for (let index = 1; index < timedActivities.length; index += 1) {
      const previous = timedActivities[index - 1];
      const current = timedActivities[index];
      if (current.start < previous.end) {
        warnings.push({
          code: 'ACTIVITY_TIME_OVERLAP',
          severity: 'high',
          message: `Hay traslape horario entre actividades (${previous.title} y ${current.title}).`,
          dayIndex: day.dayIndex
        });
        break;
      }
    }

    const totalMinutes = day.activities.reduce((sum, activity) => sum + (activity.durationMinutes ?? 0), 0);
    if (totalMinutes > 12 * 60) {
      warnings.push({
        code: 'DAY_DURATION_EXCEEDS_LIMIT',
        severity: 'medium',
        message: 'La duración total del día supera 12 horas recomendadas.',
        dayIndex: day.dayIndex
      });
    }

    if (day.activities.some((activity) => (activity.minAge ?? 0) >= 18)) {
      warnings.push({
        code: 'AGE_RESTRICTION_REVIEW',
        severity: 'low',
        message: 'Revisar compatibilidad de edad mínima para todos los viajeros.',
        dayIndex: day.dayIndex
      });
    }
  });

  return {
    schemaVersion: 'ai-itinerary-logic.v1',
    warnings
  };
}
