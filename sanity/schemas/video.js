export default {
  name: 'video',
  title: 'Video',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      validation: Rule => Rule.required(),
    },
    {
      name: 'videoUrl',
      title: 'Video URL (YouTube / Vimeo embed URL)',
      type: 'url',
      description: 'Paste the embed URL, e.g. https://www.youtube.com/embed/VIDEOID',
      validation: Rule => Rule.required(),
    },
    {
      name: 'thumbnail',
      title: 'Thumbnail Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'description',
      title: 'Short Description',
      type: 'text',
      rows: 3,
    },
    {
      name: 'series',
      title: 'Series / Category',
      type: 'string',
    },
  ],
  preview: {
    select: { title: 'title', media: 'thumbnail', subtitle: 'publishedAt' },
  },
};
