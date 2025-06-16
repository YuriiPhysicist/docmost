import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { TokenModule } from '../auth/token.module';
import { ShareSeoController } from './share-seo.controller';
import {PageAccessFilterService} from "../page/services/page-access-filter.service";
import {PageMemberService} from "../page/services/page-member.service";

@Module({
  imports: [TokenModule],
  controllers: [ShareController, ShareSeoController],
  providers: [ShareService, PageAccessFilterService, PageMemberService],
  exports: [ShareService, PageAccessFilterService],
})
export class ShareModule {}
