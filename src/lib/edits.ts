/**
 * مێژووی دەستکاری — بۆ هەر تۆمارێکی پارە (جوڵەی سندوق، جوڵەی دەفتەری قەرز، تێچوو…).
 * هەر جارێک دەستکاری بکرێت، ژمارەکە زیاد دەبێت و کاتی کۆتا دەستکاری تۆمار دەکرێت.
 */
export interface Edited {
  /** چەند جار دەستکاری کراوە */
  edits?: number
  /** کاتی کۆتا دەستکاری */
  editedAt?: number
  editedBy?: string
  editedByName?: string
}

/** زیادکردنی یەک دەستکاری بۆ تۆمارێک */
export function withEdit<T extends Edited>(row: T, user?: { uid?: string; name?: string } | null): T {
  return {
    ...row,
    edits: (row.edits || 0) + 1,
    editedAt: Date.now(),
    editedBy: user?.uid,
    editedByName: user?.name,
  }
}
