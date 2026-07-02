import { Controller, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException, Body } from "@nestjs/common";
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
}
