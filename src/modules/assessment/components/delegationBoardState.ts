/**
 * Which of the four things the delegation board should show.
 *
 * Its own module for two reasons. The rendering component must export only
 * components or Fast Refresh stops working; and this decision is worth testing
 * on its own, because the original inlined it as `!data || data.total === 0` —
 * which reported a failed request as "nothing has been sent yet". That is a
 * confident falsehood, and worse than an error, because it reads as an answer.
 */
export function delegationBoardState(input: {
  isLoading: boolean;
  isError: boolean;
  data: { total: number } | undefined;
}): 'loading' | 'error' | 'empty' | 'ready' {
  if (input.isLoading) return 'loading';
  // Order matters: an error with no data must never fall through to "empty".
  if (input.isError || !input.data) return 'error';
  return input.data.total === 0 ? 'empty' : 'ready';
}
