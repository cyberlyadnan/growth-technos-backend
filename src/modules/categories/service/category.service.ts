import { BadRequestError } from '@core/errors';
import { Category, ICategory } from '../model/category.model';
import { TaxonomyRepository } from '@modules/shared/taxonomy/taxonomy.repository';
import {
  CreateTaxonomyDto,
  TaxonomyService,
  UpdateTaxonomyDto,
} from '@modules/shared/taxonomy/taxonomy.service';

interface CategoryDto extends CreateTaxonomyDto {
  parent?: string | null;
  sortOrder?: number;
}

type CategoryUpdateDto = Partial<CategoryDto>;

const categoryRepository = new TaxonomyRepository<ICategory>(Category);

export const categoryService = new TaxonomyService<ICategory>(
  categoryRepository,
  'Category',
  ['name', 'slug', 'description'],
  (dto: CreateTaxonomyDto | UpdateTaxonomyDto) => {
    const data = dto as CategoryUpdateDto;
    return {
      ...(data.parent !== undefined && { parent: data.parent || null }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    };
  },
  async (dto: CreateTaxonomyDto | UpdateTaxonomyDto, id?: string) => {
    const data = dto as CategoryUpdateDto;
    if (!data.parent) return;

    if (id && data.parent === id) {
      throw new BadRequestError('Category cannot be its own parent');
    }

    const parent = await Category.findById(data.parent).exec();
    if (!parent) throw new BadRequestError('Parent category not found');
  },
);