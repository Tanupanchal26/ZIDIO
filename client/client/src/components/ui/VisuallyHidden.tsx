/**
 * VisuallyHidden — screen-reader-only text primitive.
 * WCAG 2.2 §1.3.1 — Information and Relationships.
 */
import type { ReactNode } from 'react';

interface Props { children: ReactNode; as?: keyof JSX.IntrinsicElements; }

export const VisuallyHidden = ({ children, as: Tag = 'span' }: Props) => (
  <Tag className="sr-only">{children}</Tag>
);

export default VisuallyHidden;
