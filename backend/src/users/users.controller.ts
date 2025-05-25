import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users') // Defines the base route for this controller
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Controller methods (endpoints) will go here, e.g.:
  // @Post()
  // async create(@Body() createUserDto: any) { // Replace any with CreateUserDto
  //   return this.usersService.create(createUserDto);
  // }

  // @Get(':id')
  // async findOne(@Param('id') id: string) {
  //   return this.usersService.findOneById(id); // Assuming findOneById exists in service
  // }
} 