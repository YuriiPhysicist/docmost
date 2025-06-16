import { Injectable } from '@nestjs/common';
import { PageMemberService } from './page-member.service';
import { PageRole } from '../../../common/helpers/types/permission';

@Injectable()
export class PageAccessFilterService {
  constructor(private readonly pageMemberService: PageMemberService) {}

  async filterPagesByAccess(pages: any[], userId: string): Promise<any[]> {
    if (!pages || pages.length === 0) {
      return pages;
    }

    const filteredPages = await Promise.all(
      pages.map(async (page) => {
        try {
          const effectiveRole = await this.pageMemberService.getUserEffectiveRole(
            userId,
            page.id
          );

          if (effectiveRole === PageRole.BLOCKED) {
            return null;
          }

          return {
            ...page,
            effectiveRole,
          };
        } catch (error) {
          return null;
        }
      })
    );

    return filteredPages.filter(page => page !== null);
  }
}