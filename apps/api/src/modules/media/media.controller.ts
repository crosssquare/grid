import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  ParseUUIDPipe,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Body
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { MediaService } from "./media.service";

@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @CurrentUser() userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("mediaType") mediaType: string
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    if (mediaType !== "photo" && mediaType !== "video") {
      throw new BadRequestException("mediaType must be 'photo' or 'video'");
    }
    return this.media.upload(userId, file, mediaType);
  }

  @Get("mine")
  listMine(@CurrentUser() userId: string) {
    return this.media.listMine(userId);
  }

  @Get("user/:userId")
  listForUser(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.media.listForUser(userId);
  }

  @Put(":id/profile-photo")
  setProfilePhoto(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.media.setProfilePhoto(userId, id);
  }
}
