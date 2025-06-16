export type SpaceTreeNode = {
  id: string;
  slugId: string;
  name: string;
  icon?: string;
  position: string;
  spaceId: string;
  parentPageId: string;
  hasChildren: boolean;
  hasVisibleChildren: boolean;
  children: SpaceTreeNode[];
  effectiveRole: string;
};
