import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service';
import {
  SearchDTO,
  SearchShareDTO,
  SearchSuggestionDTO,
} from './dto/search.dto';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { PageMemberService } from '../page/services/page-member.service'; // Додаємо імпорт
import { PageRole } from '../../common/helpers/types/permission'; // Додаємо імпорт

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly pageMemberService: PageMemberService, // Додаємо інжекцію
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  async pageSearch(
    @Body() searchDto: SearchDTO,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    delete searchDto.shareId;

    if (searchDto.spaceId) {
      const ability = await this.spaceAbility.createForUser(
        user,
        searchDto.spaceId,
      );

      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw new ForbiddenException();
      }
    }

    const searchResults = await this.searchService.searchPage(searchDto.query, searchDto, {
      userId: user.id,
      workspaceId: workspace.id,
    });

    const filteredResults = await this.filterSearchResultsByEffectiveRole(
      searchResults,
      user.id
    );

    return filteredResults;
  }

  @HttpCode(HttpStatus.OK)
  @Post('suggest')
  async searchSuggestions(
    @Body() dto: SearchSuggestionDTO,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const suggestions = await this.searchService.searchSuggestions(dto, user.id, workspace.id);

    // Фільтруємо сторінки в suggestions за effectiveRole
    if (suggestions.pages && suggestions.pages.length > 0) {
      const filteredPages = await this.filterPagesSuggestionsByEffectiveRole(
        suggestions.pages,
        user.id
      );
      suggestions.pages = filteredPages;
    }

    return suggestions;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('share-search')
  async searchShare(
    @Body() searchDto: SearchShareDTO,
    @AuthWorkspace() workspace: Workspace,
  ) {
    delete searchDto.spaceId;
    if (!searchDto.shareId) {
      throw new BadRequestException('shareId is required');
    }

    return this.searchService.searchPage(searchDto.query, searchDto, {
      workspaceId: workspace.id,
    });
  }

  private async filterSearchResultsByEffectiveRole(
    searchResults: any[],
    userId: string
  ): Promise<any[]> {
    if (!searchResults || searchResults.length === 0) {
      return searchResults;
    }

    const filteredResults = await Promise.all(
      searchResults.map(async (result) => {
        try {
          const effectiveRole = await this.pageMemberService.getUserEffectiveRole(
            userId,
            result.id
          );

          if (effectiveRole === PageRole.BLOCKED) {
            return null;
          }

          return {
            ...result,
            effectiveRole,
          };
        } catch (error) {
          return null;
        }
      })
    );

    return filteredResults.filter(result => result !== null);
  }

  private async filterPagesSuggestionsByEffectiveRole(
    pages: any[],
    userId: string
  ): Promise<any[]> {
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